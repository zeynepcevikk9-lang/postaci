import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AdminCustomersRepository,
  CustomersParams,
} from '@gitroom/nestjs-libraries/database/prisma/admin-customers/admin-customers.repository';
import {
  IYZICO_PROVIDER,
  IyzicoProvider,
  MANUAL_PLAN_PREFIX,
} from '@gitroom/nestjs-libraries/services/payment/providers/iyzico.provider';
import { AdminSetPlanDto } from '@gitroom/nestjs-libraries/dtos/admin/admin.set.plan.dto';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';

@Injectable()
export class AdminCustomersService {
  constructor(
    private _adminCustomersRepository: AdminCustomersRepository,
    private _iyzicoProvider: IyzicoProvider,
    private _subscriptionService: SubscriptionService,
    private _notificationService: NotificationService
  ) {}

  // Hesaba elle plan verir ya da aboneliğini kaldırır. Kaldırmada kartla süren
  // abonelik varsa iyzico'da da hemen iptal edilir (iade yapılmaz).
  async setPlan(organizationId: string, body: AdminSetPlanDto) {
    if (!(await this._adminCustomersRepository.getOrganization(organizationId))) {
      throw new BadRequestException('Account not found');
    }

    if (body.plan === 'FREE') {
      const current =
        await this._subscriptionService.getSubscriptionByOrganizationId(
          organizationId
        );
      if (!current) {
        return { success: true };
      }
      if (current.provider !== IYZICO_PROVIDER || current.isLifetime) {
        throw new BadRequestException(
          'This subscription is managed by another provider'
        );
      }
      await this._iyzicoProvider.cancelSubscription(organizationId);
      await this.notify(
        organizationId,
        'Aboneliğiniz sona erdi',
        'Aboneliğiniz sona erdi. Yeniden abone olmak için Faturalandırma sayfasını kullanabilirsiniz.'
      );
      return { success: true };
    }

    const until = body.until ? new Date(body.until) : null;
    if (until) {
      // Seçilen günün sonuna kadar geçerli olsun (Türkiye saati, UTC+3)
      until.setUTCHours(20, 59, 59, 0);
      if (until.getTime() < Date.now()) {
        throw new BadRequestException('The end date must be in the future');
      }
    }

    await this._iyzicoProvider.grantManualPlan(
      organizationId,
      body.plan,
      body.period || 'MONTHLY',
      until
    );
    await this.notify(
      organizationId,
      'Planınız tanımlandı',
      until
        ? `Planınız tanımlandı ve ${until.toLocaleDateString('tr-TR', {
            timeZone: 'Europe/Istanbul',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })} tarihine kadar geçerli.`
        : 'Planınız tanımlandı.'
    );
    return { success: true };
  }

  private async notify(organizationId: string, subject: string, message: string) {
    try {
      await this._notificationService.inAppNotification(
        organizationId,
        subject,
        message,
        true
      );
    } catch (err) {
      // bildirim gönderilemese de işlem geçerlidir
    }
  }

  async list(params: CustomersParams) {
    const { total, rows } = await this._adminCustomersRepository.list(params);

    return {
      total,
      page: params.page,
      limit: params.limit,
      customers: rows.map((row) => {
        // Hesabı açan kişi: ilk yönetici, yoksa ilk üye.
        const owner = (
          row.users.find((member) => member.role === 'SUPERADMIN') ||
          row.users[0]
        )?.user;
        return {
          id: row.id,
          name: row.name,
          createdAt: row.createdAt,
          owner: owner || null,
          members: row.users.length,
          channels: row._count.Integration,
          posts: row._count.post,
          customers: row._count.customers,
          plan: row.subscription?.subscriptionTier || 'FREE',
          period: row.subscription?.period || null,
          provider: row.subscription?.provider || null,
          // Elle verilmiş plan mı (kartla abonelik değil)
          manual: !!row.subscription?.identifier?.startsWith(MANUAL_PLAN_PREFIX),
          subscribedAt: row.subscription?.createdAt || null,
          cancelAt: row.subscription?.cancelAt || null,
          isLifetime: !!row.subscription?.isLifetime,
          trialing: !!row.subscription && row.isTrailing,
        };
      }),
    };
  }

  // Özet kutuları. Tahmini aylık gelir, iyzico'daki plan fiyatlarıyla hesaplanır
  // (yıllık planlar on ikiye bölünür); iyzico kurulu değilse ya da fiyat
  // okunamazsa boş döner.
  async summary() {
    const { accounts, byPlan, trialing, cancelling } =
      await this._adminCustomersRepository.summary();
    const subscribed = byPlan.reduce((all, row) => all + row._count._all, 0);

    let monthlyRevenue: number | null = null;
    let currency: string | null = null;
    try {
      const { enabled, plans } = await this._iyzicoProvider.getPlans();
      if (enabled && plans.length) {
        const paying = await this._adminCustomersRepository.payingByPlan(
          IYZICO_PROVIDER,
          MANUAL_PLAN_PREFIX
        );
        monthlyRevenue = 0;
        currency = plans[0].currency;
        for (const row of paying) {
          const plan = plans.find(
            (p) => p.billing === row.subscriptionTier && p.period === row.period
          );
          if (plan) {
            monthlyRevenue +=
              (row._count._all * plan.price) /
              (plan.period === 'YEARLY' ? 12 : 1);
          }
        }
      }
    } catch (err) {
      monthlyRevenue = null;
    }

    return {
      accounts,
      subscribed,
      free: accounts - subscribed,
      trialing,
      cancelling,
      byPlan: byPlan.map((row) => ({
        plan: row.subscriptionTier,
        count: row._count._all,
      })),
      monthlyRevenue,
      currency,
    };
  }
}
