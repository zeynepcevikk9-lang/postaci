import { BadRequestException, Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import dayjs from 'dayjs';
import { BankTransferRepository } from '@gitroom/nestjs-libraries/database/prisma/bank-transfer/bank.transfer.repository';
import { BankTransferRequestDto } from '@gitroom/nestjs-libraries/dtos/billing/bank.transfer.dto';
import {
  IyzicoPlan,
  IyzicoProvider,
  MANUAL_PLAN_PREFIX,
} from '@gitroom/nestjs-libraries/services/payment/providers/iyzico.provider';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';

const TIERS = ['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'] as const;
const PERIODS = ['MONTHLY', 'YEARLY'] as const;

// Postacı: havale / EFT ile satış. Banka bilgileri ortam değişkenlerinden gelir
// (BANK_TRANSFER_IBAN, BANK_TRANSFER_ACCOUNT_NAME, BANK_TRANSFER_BANK_NAME).
// iyzico kuruluysa plan adı ve fiyatı oradan, değilse PLAN_PRICE_<KADEME>_<DÖNEM>
// ve PLAN_NAME_<KADEME> değişkenlerinden okunur.
@Injectable()
export class BankTransferService {
  constructor(
    private _bankTransferRepository: BankTransferRepository,
    private _iyzicoProvider: IyzicoProvider,
    private _subscriptionService: SubscriptionService,
    private _notificationService: NotificationService
  ) {}

  isEnabled() {
    return (
      !!process.env.BANK_TRANSFER_IBAN && !!process.env.BANK_TRANSFER_ACCOUNT_NAME
    );
  }

  private envPlans(): IyzicoPlan[] {
    return TIERS.flatMap((billing) =>
      PERIODS.map((period) => ({
        billing,
        period,
        name: process.env[`PLAN_NAME_${billing}`] || billing,
        price: Number(process.env[`PLAN_PRICE_${billing}_${period}`] || 0),
        currency: 'TRY',
        trialDays: 0,
      }))
    ).filter((plan) => plan.price > 0);
  }

  // Satıştaki planlar: iyzico kuruluysa oradan, değilse ortam değişkenlerinden.
  async getSalePlans() {
    const iyzico = await this._iyzicoProvider.getPlans();
    return iyzico.enabled ? iyzico.plans : this.envPlans();
  }

  // Havale açıklamasına yazılacak kısa kod; ödemeyi hesapla eşleştirmek için.
  private code(organizationId: string) {
    return 'PST-' + organizationId.replace(/-/g, '').slice(0, 6).toUpperCase();
  }

  // Plan seçme ekranının tamamı: kartla abonelik (iyzico) ve/veya havale.
  async getPlanScreen(org: Organization) {
    const iyzico = await this._iyzicoProvider.getPlans(org.allowTrial);
    const transferEnabled = this.isEnabled();
    const plans = iyzico.enabled ? iyzico.plans : this.envPlans();

    return {
      enabled: iyzico.enabled || (transferEnabled && plans.length > 0),
      card: iyzico.enabled,
      plans,
      transfer:
        transferEnabled && plans.length
          ? {
              iban: process.env.BANK_TRANSFER_IBAN,
              accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME,
              bankName: process.env.BANK_TRANSFER_BANK_NAME || null,
              code: this.code(org.id),
              pending: await this._bankTransferRepository.getPending(org.id),
            }
          : null,
    };
  }

  // Kullanıcı: "havaleyi yaptım". Tutar plandan alınır, kullanıcıdan değil.
  async createRequest(
    org: Organization,
    userId: string,
    body: BankTransferRequestDto
  ) {
    const screen = await this.getPlanScreen(org);
    if (!screen.transfer) {
      throw new BadRequestException('Bank transfer is not available');
    }
    const plan = screen.plans.find(
      (p) => p.billing === body.billing && p.period === body.period
    );
    if (!plan) {
      throw new BadRequestException('This plan is not available');
    }

    // Kartla süren abonelik varken havale bildirimi alınmaz (iki kez ödeme olmasın).
    const current =
      await this._subscriptionService.getSubscriptionByOrganizationId(org.id);
    if (
      current &&
      !current.cancelAt &&
      !current.identifier?.startsWith(MANUAL_PLAN_PREFIX)
    ) {
      throw new BadRequestException(
        'This organization already has a subscription'
      );
    }

    const request = await this._bankTransferRepository.savePending(
      org.id,
      userId,
      {
        billing: plan.billing,
        period: plan.period,
        amount: plan.price,
        code: screen.transfer.code,
      }
    );

    if (process.env.BANK_TRANSFER_NOTIFY_EMAIL) {
      try {
        await this._notificationService.sendEmail(
          process.env.BANK_TRANSFER_NOTIFY_EMAIL,
          `Havale bildirimi: ${org.name}`,
          `${org.name} hesabı ${plan.name} (${
            plan.period === 'YEARLY' ? 'yıllık' : 'aylık'
          }) planı için ${plan.price} TL havale yaptığını bildirdi. Açıklama kodu: ${
            screen.transfer.code
          }. Ödemeyi gördükten sonra yönetim panelinden onaylayın.`
        );
      } catch (err) {
        // e-posta gönderilemese de bildirim yönetim panelinde görünür
      }
    }

    return request;
  }

  // Yönetici: bekleyen bildirimler, hesap adı ve sahibinin e-postasıyla.
  async listPending() {
    const requests = await this._bankTransferRepository.listPending();
    const organizations = await this._bankTransferRepository.getOrganizations(
      requests.map((request) => request.organizationId)
    );
    return requests.map((request) => {
      const organization = organizations.find(
        (o) => o.id === request.organizationId
      );
      return {
        ...request,
        organizationName: organization?.name || '',
        email: organization?.users[0]?.user.email || '',
      };
    });
  }

  // Yönetici: ödeme görüldü. Plan elle tanımlanır; süre, hesabın süren elle
  // planı varsa onun bitişinden, yoksa bugünden başlar.
  async approve(id: string) {
    const request = await this._bankTransferRepository.getRequest(id);
    if (!request || !(await this._bankTransferRepository.decide(id, 'APPROVED'))) {
      throw new BadRequestException('Request not found or already decided');
    }

    try {
      const current =
        await this._subscriptionService.getSubscriptionByOrganizationId(
          request.organizationId
        );
      const from =
        current?.identifier?.startsWith(MANUAL_PLAN_PREFIX) &&
        current.cancelAt &&
        current.cancelAt.getTime() > Date.now()
          ? dayjs(current.cancelAt)
          : dayjs();
      // Günün sonu, Türkiye saatiyle (UTC+3)
      const until = from
        .add(1, request.period === 'YEARLY' ? 'year' : 'month')
        .toDate();
      until.setUTCHours(20, 59, 59, 0);

      await this._iyzicoProvider.grantManualPlan(
        request.organizationId,
        request.billing as (typeof TIERS)[number],
        request.period as (typeof PERIODS)[number],
        until
      );

      try {
        await this._notificationService.inAppNotification(
          request.organizationId,
          'Ödemeniz alındı',
          `Havale ödemeniz alındı. Planınız ${until.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Europe/Istanbul',
          })} tarihine kadar geçerli.`,
          true
        );
      } catch (err) {
        // bildirim gönderilemese de plan tanımlanmıştır
      }
      return { success: true, until };
    } catch (err) {
      // Plan tanımlanamadıysa bildirim yeniden bekleyene alınır.
      await this._bankTransferRepository.reopen(id);
      throw err;
    }
  }

  async reject(id: string) {
    const request = await this._bankTransferRepository.getRequest(id);
    if (!request || !(await this._bankTransferRepository.decide(id, 'REJECTED'))) {
      throw new BadRequestException('Request not found or already decided');
    }
    try {
      await this._notificationService.inAppNotification(
        request.organizationId,
        'Havale bildiriminiz onaylanmadı',
        'Havale ödemenizi hesabımızda göremedik. Ödemeyi yaptıysanız açıklama kodunu ve dekontu bize iletin.',
        true
      );
    } catch (err) {
      // bildirim gönderilemese de karar geçerlidir
    }
    return { success: true };
  }
}
