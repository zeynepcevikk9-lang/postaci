import { BadRequestException, HttpException, OnModuleInit } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { IyzicoCheckout, User } from '@prisma/client';
import {
  PaymentInvoice,
  PaymentPlatform,
  PaymentProvider,
  PaymentProviderAbstract,
} from '@gitroom/nestjs-libraries/services/payment/payment.provider.interface';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { IyzicoRepository } from '@gitroom/nestjs-libraries/database/prisma/iyzico/iyzico.repository';
import { IyzicoCheckoutDto } from '@gitroom/nestjs-libraries/dtos/billing/iyzico.checkout.dto';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export const IYZICO_PROVIDER = 'iyzico';
// Yöneticinin elle verdiği planın (havale ile ödeme) abonelik kimliği bununla başlar.
export const MANUAL_PLAN_PREFIX = 'manual-';

type Tier = 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE';
type Period = 'MONTHLY' | 'YEARLY';

const TIERS: Tier[] = ['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'];
const PERIODS: Period[] = ['MONTHLY', 'YEARLY'];

const HOUR = 60 * 60 * 1000;
// Ödemesi alınamayan aboneliğe tanınan süre; bu sürede ödeme gelmezse abonelik biter.
const GRACE_DAYS = 3;
const REQUEST_TIMEOUT_MS = 20_000;
const PLAN_TIMEOUT_MS = 8_000;
const PLAN_CACHE_MS = 10 * 60 * 1000;
// Okunamayan plan bir dakika boyunca yeniden sorulmaz (iyzico kesintisinde ekran beklemesin).
const PLAN_FAILURE_CACHE_MS = 60 * 1000;
const SWEEP_EVERY_MS = HOUR;

interface IyzicoOrder {
  referenceCode: string;
  price: number;
  currencyCode: string;
  startPeriod: number;
  endPeriod: number;
  orderStatus: 'WAITING' | 'SUCCESS' | 'FAILED';
}

interface IyzicoSubscription {
  referenceCode: string;
  pricingPlanReferenceCode: string;
  subscriptionStatus:
    | 'ACTIVE'
    | 'PENDING'
    | 'UNPAID'
    | 'UPGRADED'
    | 'CANCELED'
    | 'EXPIRED';
  trialEndDate?: number;
  orders?: IyzicoOrder[];
}

interface IyzicoPlanDetail {
  name: string;
  price: number;
  currency: string;
  trialDays: number;
}

export interface IyzicoPlan extends IyzicoPlanDetail {
  billing: Tier;
  period: Period;
}

const planCache = new Map<
  string,
  { at: number; detail: Promise<IyzicoPlanDetail | null> }
>();
let sweepTimer: NodeJS.Timeout | null = null;

// Postacı: iyzico ile TL abonelik. Kart bilgisi iyzico'nun ödeme formunda girilir,
// bize ulaşmaz. Abonelik, deneme süresi ve aylık/yıllık yenileme iyzico'dadır;
// iyzico doğrunun kaynağıdır: webhook ve ödeme dönüşü yalnızca hangi aboneliğin
// yeniden okunacağını söyler, durum her seferinde iyzico API'sinden alınır.
//
// Planlar iyzico panelinde tanımlanır, referans kodları ortam değişkenine yazılır:
// IYZICO_PLAN_<STANDARD|TEAM|PRO|ULTIMATE>_<MONTHLY|YEARLY>. Deneme süreli bir
// planın denemesiz eşi IYZICO_PLAN_..._NO_TRIAL ile verilir; daha önce abone
// olmuş hesaplar onunla başlar. Fiyat, ad ve deneme süresi iyzico'dan okunur.
@PaymentProvider({ provider: IYZICO_PROVIDER })
export class IyzicoProvider
  extends PaymentProviderAbstract
  implements OnModuleInit
{
  platform: PaymentPlatform = 'web';

  constructor(
    private _subscriptionService: SubscriptionService,
    private _notificationService: NotificationService,
    private _iyzicoRepository: IyzicoRepository
  ) {
    super();
  }

  // iyzico'da "dönem sonunda iptal" ya da "bitiş" bildirimi yoktur; açılışta ve
  // sonra saatte bir, bitiş tarihi geçen abonelikler kapatılır ve ödeme
  // dönüşü bize ulaşmamış formlar iyzico'ya sorulur.
  onModuleInit() {
    if (sweepTimer) {
      return;
    }
    this.sweep();
    sweepTimer = setInterval(() => {
      this.sweep();
    }, SWEEP_EVERY_MS);
    sweepTimer.unref();
  }

  private async sweep() {
    await this.expireSubscriptions();
    if (this.isConfigured()) {
      await this.reconcilePendingCheckouts(24 * HOUR, 5 * 60 * 1000);
    }
  }

  isConfigured() {
    return !!process.env.IYZICO_API_KEY && !!process.env.IYZICO_SECRET_KEY;
  }

  // Yeni abonelikler iyzico ile mi başlıyor (ekranda TL planlar gösterilsin mi)
  isWebDefault() {
    return (
      this.isConfigured() && process.env.PAYMENT_PROVIDER_WEB === IYZICO_PROVIDER
    );
  }

  // Canlı adres açıkça yazılmadıkça deneme ortamı kullanılır.
  private baseUrl() {
    return (
      process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
    ).replace(/\/+$/, '');
  }

  // IYZWSv2 kimlik doğrulaması: HMAC-SHA256(rastgele anahtar + yol + gövde).
  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: object,
    timeout = REQUEST_TIMEOUT_MS
  ) {
    if (!this.isConfigured()) {
      throw new HttpException('iyzico is not configured', 400);
    }

    const payload = body ? JSON.stringify(body) : '';
    const randomKey = `${Date.now()}${randomBytes(8).toString('hex')}`;
    const signature = createHmac('sha256', process.env.IYZICO_SECRET_KEY!)
      .update(randomKey + path + payload)
      .digest('hex');
    const authorization = Buffer.from(
      `apiKey:${process.env.IYZICO_API_KEY}&randomKey:${randomKey}&signature:${signature}`
    ).toString('base64');

    let data: any = null;
    try {
      const response = await fetch(this.baseUrl() + path, {
        method,
        headers: {
          Authorization: `IYZWSv2 ${authorization}`,
          'x-iyzi-rnd': randomKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        ...(body ? { body: payload } : {}),
        signal: AbortSignal.timeout(timeout),
      });
      data = await response.json();
    } catch (err) {
      throw new HttpException('iyzico could not be reached', 502);
    }

    if (data?.status !== 'success') {
      throw new HttpException(
        data?.errorMessage || 'iyzico request failed',
        400
      );
    }
    return data;
  }

  private planCodes() {
    return TIERS.flatMap((billing) =>
      PERIODS.map((period) => ({
        billing,
        period,
        code: process.env[`IYZICO_PLAN_${billing}_${period}`] || '',
        noTrialCode:
          process.env[`IYZICO_PLAN_${billing}_${period}_NO_TRIAL`] || '',
      }))
    ).filter((plan) => plan.code);
  }

  private findPlanByCode(code?: string) {
    return this.planCodes().find(
      (plan) => !!code && (plan.code === code || plan.noTrialCode === code)
    );
  }

  // Tek planın adı, fiyatı ve deneme süresi. Sonuç (okunamadıysa kısa süreliğine
  // o da) saklanır; aynı anda gelen istekler tek çağrıyı paylaşır.
  private readPlan(code: string) {
    const cached = planCache.get(code);
    if (cached && Date.now() - cached.at < PLAN_CACHE_MS) {
      return cached.detail;
    }

    const entry: { at: number; detail: Promise<IyzicoPlanDetail | null> } = {
      at: Date.now(),
      detail: this.request(
        'GET',
        `/v2/subscription/pricing-plans/${encodeURIComponent(code)}`,
        undefined,
        PLAN_TIMEOUT_MS
      )
        .then(
          ({ data }): IyzicoPlanDetail => ({
            name: String(data?.name || ''),
            price: Number(data?.price || 0),
            currency: String(data?.currencyCode || 'TRY'),
            trialDays: Number(data?.trialPeriodDays || 0),
          })
        )
        .catch((): null => {
          console.error('iyzico plan could not be read', code);
          entry.at = Date.now() - PLAN_CACHE_MS + PLAN_FAILURE_CACHE_MS;
          return null;
        }),
    };
    planCache.set(code, entry);
    return entry.detail;
  }

  // Satışa açık planlar. Deneme hakkı kalmamış hesaba, tanımlıysa planın
  // denemesiz eşi gösterilir.
  async getPlans(
    allowTrial = true
  ): Promise<{ enabled: boolean; plans: IyzicoPlan[] }> {
    if (!this.isWebDefault()) {
      return { enabled: false, plans: [] };
    }

    const plans = await Promise.all(
      this.planCodes().map(async ({ billing, period, code, noTrialCode }) => {
        const detail = await this.readPlan(
          !allowTrial && noTrialCode ? noTrialCode : code
        );
        return detail
          ? { billing, period, ...detail, name: detail.name || billing }
          : null;
      })
    );

    return {
      enabled: true,
      plans: plans.filter((plan): plan is IyzicoPlan => !!plan),
    };
  }

  override async getPackages() {
    return (await this.getPlans()).plans;
  }

  // Ödeme formunu başlatır; dönen içerik (iyzico'nun betiği) sayfaya yerleştirilir.
  async checkout(
    organizationId: string,
    allowTrial: boolean,
    user: User,
    body: IyzicoCheckoutDto
  ) {
    const plan = this.planCodes().find(
      (p) => p.billing === body.billing && p.period === body.period
    );
    if (!plan) {
      throw new BadRequestException('This plan is not available');
    }
    if (
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      )
    ) {
      throw new BadRequestException(
        'This organization already has a subscription'
      );
    }

    const contactName = `${body.name} ${body.surname}`;
    const response = await this.request(
      'POST',
      '/v2/subscription/checkoutform/initialize',
      {
        locale: 'tr',
        callbackUrl: `${process.env.NEXT_PUBLIC_BACKEND_URL}/public/iyzico/callback`,
        pricingPlanReferenceCode:
          !allowTrial && plan.noTrialCode ? plan.noTrialCode : plan.code,
        subscriptionInitialStatus: 'ACTIVE',
        customer: {
          name: body.name,
          surname: body.surname,
          email: user.email,
          gsmNumber: body.gsmNumber,
          identityNumber: body.identityNumber,
          billingAddress: {
            contactName,
            address: body.address,
            city: body.city,
            country: 'Türkiye',
          },
          shippingAddress: {
            contactName,
            address: body.address,
            city: body.city,
            country: 'Türkiye',
          },
        },
      }
    );

    if (!response.token || !response.checkoutFormContent) {
      throw new HttpException('iyzico did not return a checkout form', 400);
    }

    await this._iyzicoRepository.createCheckout(
      organizationId,
      user.id,
      response.token,
      body.billing,
      body.period
    );

    return { checkoutFormContent: response.checkoutFormContent as string };
  }

  // Formun sonucunu iyzico'ya sorar ve aboneliği yazar. Ödeme yapılmadıysa
  // iyzico hata döner (istek hata fırlatır).
  private async finishCheckout(checkout: IyzicoCheckout) {
    if (!checkout.subscriptionReferenceCode) {
      const { data } = await this.request(
        'GET',
        `/v2/subscription/checkoutform/${encodeURIComponent(checkout.token)}`
      );
      if (!data?.referenceCode) {
        return false;
      }
      const referenceCode = String(data.referenceCode);

      // İki ayrı ödeme formu tamamlandıysa ikinci abonelik hemen iptal edilir;
      // yoksa izlenmeyen bir abonelik kartı çekmeye devam ederdi. İptal
      // edilemezse form tamamlanmış sayılmaz ve bir sonraki turda yeniden denenir.
      const current =
        await this._subscriptionService.getSubscriptionByOrganizationId(
          checkout.organizationId
        );
      if (current && current.identifier !== referenceCode) {
        console.error(
          'iyzico duplicate subscription is being cancelled, a refund may be needed',
          checkout.organizationId,
          referenceCode
        );
        await this.cancelAtIyzico(referenceCode);
        await this._iyzicoRepository.discardCheckout(checkout.id);
        return true;
      }

      await this._iyzicoRepository.completeCheckout(
        checkout.id,
        referenceCode,
        data.customerReferenceCode ? String(data.customerReferenceCode) : null
      );
    }

    return (await this.syncSubscription(checkout.organizationId)).active;
  }

  // Ödeme formundan dönüş. Tarayıcıdan gelen tek bilgi form anahtarıdır; sonuç
  // iyzico'ya sorulur. Hata fırlatmaz: kullanıcı her durumda panele yönlendirilir.
  async completeCheckout(token: string) {
    try {
      const checkout = token
        ? await this._iyzicoRepository.getCheckoutByToken(token)
        : null;
      return checkout ? await this.finishCheckout(checkout) : false;
    } catch (err) {
      console.error('iyzico checkout could not be completed', err);
      return false;
    }
  }

  // Ödeme yapılmış ama tarayıcı bize dönmemiş (sekme kapanmış, bağlantı kopmuş)
  // formları bulup tamamlar. Ödenmemiş formlar için iyzico hata döner, geçilir.
  private async reconcilePendingCheckouts(maxAgeMs: number, minAgeMs: number) {
    try {
      const pending = await this._iyzicoRepository.getPendingCheckouts(
        new Date(Date.now() - maxAgeMs),
        new Date(Date.now() - minAgeMs)
      );
      for (const checkout of pending) {
        try {
          await this.finishCheckout(checkout);
        } catch (err) {
          // ödeme yapılmamış ya da iyzico'ya ulaşılamadı; sonraki turda yeniden bakılır
        }
      }
    } catch (err) {
      console.error('iyzico pending checkouts could not be reconciled', err);
    }
  }

  private async getSubscriptionDetail(
    referenceCode: string
  ): Promise<IyzicoSubscription | undefined> {
    const { data } = await this.request(
      'GET',
      `/v2/subscription/subscriptions/${encodeURIComponent(referenceCode)}`
    );
    // Belgeler yanıtı sayfalı liste olarak tarif eder; tek kayıt dönen biçim de kabul edilir.
    return data?.items?.[0] || (data?.referenceCode ? data : undefined);
  }

  // Ödemesi alınmış (ya da deneme) sürenin bittiği an, milisaniye.
  private paidUntil(subscription: IyzicoSubscription) {
    return Math.max(
      subscription.trialEndDate || 0,
      ...(subscription.orders || [])
        .filter((order) => order.orderStatus === 'SUCCESS')
        .map((order) => order.endPeriod || 0)
    );
  }

  // Organizasyonun aboneliğini iyzico'daki duruma göre yeniden yazar. Abonelik
  // yalnızca iyzico açıkça "iptal edildi" ya da "süresi doldu" derse kaldırılır;
  // tanınmayan ya da okunamayan bir durumda hiçbir şeye dokunulmaz.
  override async syncSubscription(organizationId: string) {
    const checkout = await this._iyzicoRepository.getLastCompletedCheckout(
      organizationId
    );
    if (!checkout?.subscriptionReferenceCode) {
      return { active: false };
    }

    const subscription = await this.getSubscriptionDetail(
      checkout.subscriptionReferenceCode
    );
    const status = subscription?.subscriptionStatus;
    const current =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    // Kayıt bu iyzico aboneliğine mi ait (elle verilmiş plan ya da başka bir
    // abonelik değil mi)
    const owned =
      current?.provider === IYZICO_PROVIDER &&
      current.identifier === checkout.subscriptionReferenceCode;

    if (subscription && status === 'ACTIVE') {
      const plan = this.findPlanByCode(
        subscription.pricingPlanReferenceCode
      ) || {
        billing: checkout.billing as Tier,
        period: checkout.period as Period,
      };
      await this._subscriptionService.createOrUpdateSubscriptionByOrg(
        (subscription.trialEndDate || 0) > Date.now(),
        organizationId,
        IYZICO_PROVIDER,
        subscription.referenceCode,
        pricing[plan.billing].channel!,
        plan.billing,
        plan.period,
        null
      );
      return { active: true };
    }

    // Ödeme alınamadı: kısa bir süre tanınır, süre bir kez başlar.
    if (status === 'UNPAID') {
      if (owned && !current?.cancelAt) {
        await this._subscriptionService.updateCancelAt(
          organizationId,
          Math.floor(Date.now() / 1000) + GRACE_DAYS * 24 * 60 * 60
        );
      }
      return { active: owned };
    }

    if (subscription && (status === 'CANCELED' || status === 'EXPIRED')) {
      // İptal edildi: ödemesi alınmış dönemin sonuna kadar kullanım sürer.
      const until = status === 'CANCELED' ? this.paidUntil(subscription) : 0;
      if (owned && until > Date.now()) {
        await this._subscriptionService.updateCancelAt(
          organizationId,
          Math.floor(until / 1000)
        );
        return { active: true };
      }
      if (owned) {
        await this._subscriptionService.deleteSubscriptionByOrgId(
          organizationId,
          IYZICO_PROVIDER
        );
      }
      return { active: false };
    }

    // PENDING (henüz başlamadı), UPGRADED (panelden plan değiştirildi) ya da
    // okunamayan yanıt: abonelik olduğu gibi bırakılır.
    if (status !== 'PENDING') {
      console.error(
        'iyzico subscription status is not handled',
        organizationId,
        status
      );
    }
    return { active: owned };
  }

  // iyzico imzası: merchantId + secretKey + olay + abonelik + sipariş + müşteri
  // kodlarının HMAC-SHA256 özeti. Belgede ilk iki alanın sırası iki türlü de
  // geçtiği için ikisi de kabul edilir. İmza özelliği iyzico'dan ayrıca
  // açtırılır; açılana kadar (IYZICO_MERCHANT_ID boş) imzaya bakılamaz. Bu
  // durumda da olayın içeriğine güvenilmez: olay yalnızca aboneliğin iyzico'dan
  // yeniden okunmasını tetikler.
  validateWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    let event: any;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
      throw new HttpException('Invalid webhook payload', 400);
    }

    const merchantId = process.env.IYZICO_MERCHANT_ID;
    const secretKey = process.env.IYZICO_SECRET_KEY;
    if (!secretKey) {
      throw new HttpException('iyzico is not configured', 401);
    }
    if (!merchantId) {
      return event;
    }

    const given = Buffer.from(String(headers['x-iyz-signature-v3'] || ''));
    const tail = [
      event?.iyziEventType,
      event?.subscriptionReferenceCode,
      event?.orderReferenceCode,
      event?.customerReferenceCode,
    ].join('');
    const valid = [merchantId + secretKey, secretKey + merchantId].some(
      (head) => {
        const expected = Buffer.from(
          createHmac('sha256', secretKey)
            .update(head + tail)
            .digest('hex')
        );
        return (
          expected.length === given.length && timingSafeEqual(expected, given)
        );
      }
    );
    if (!valid) {
      throw new HttpException('Invalid webhook signature', 401);
    }
    return event;
  }

  // Webhook işlemi hata fırlatmaz; sorun olursa kaydedilir ve iyzico'ya yine
  // "alındı" denir, durum bir sonraki olayda ya da saatlik kontrolde düzelir.
  async processWebhook(event: any) {
    try {
      const referenceCode = event?.subscriptionReferenceCode
        ? String(event.subscriptionReferenceCode)
        : '';
      if (!referenceCode) {
        return { ok: true };
      }

      let checkout = await this._iyzicoRepository.getCheckoutBySubscription(
        referenceCode
      );
      if (!checkout) {
        // Ödeme dönüşü bize ulaşmamış olabilir: bekleyen formlar iyzico'ya sorulur.
        await this.reconcilePendingCheckouts(72 * HOUR, 0);
        checkout = await this._iyzicoRepository.getCheckoutBySubscription(
          referenceCode
        );
      }
      if (!checkout) {
        return { ok: true };
      }

      await this.syncSubscription(checkout.organizationId);

      if (event.iyziEventType === 'subscription.order.failure') {
        await this._notificationService.inAppNotification(
          checkout.organizationId,
          'Abonelik ödemeniz alınamadı',
          `Abonelik ödemeniz kartınızdan alınamadı. ${GRACE_DAYS} gün içinde ödeme alınamazsa aboneliğiniz sona erer.`,
          true,
          false,
          'fail'
        );
      }
    } catch (err) {
      console.error('iyzico webhook could not be processed', err);
    }
    return { ok: true };
  }

  // Bitiş tarihi geçen abonelikleri kapatır. Önce iyzico'da iptal edilir; iptal
  // edilemeyen abonelik bu turda kapatılmaz (kart çekilmeye devam ederken
  // hesabın düşmesi yerine bir sonraki turda yeniden denenir).
  async expireSubscriptions() {
    try {
      const expired = await this._iyzicoRepository.getExpiredSubscriptions(
        IYZICO_PROVIDER
      );
      for (const { organizationId } of expired) {
        try {
          await this.cancelAllSubscriptions(organizationId);
          await this._subscriptionService.deleteSubscriptionByOrgId(
            organizationId,
            IYZICO_PROVIDER
          );
        } catch (err) {
          console.error(
            'iyzico expired subscription could not be closed',
            organizationId,
            err
          );
        }
      }
    } catch (err) {
      console.error('iyzico expired subscriptions could not be listed', err);
    }
  }

  // Abonelik zaten iptal edilmiş ya da süresi dolmuşsa sorun değildir; iyzico'ya
  // ulaşılamaması gibi gerçek bir hata ise çağırana iletilir.
  private async cancelAtIyzico(referenceCode: string) {
    try {
      await this.request(
        'POST',
        `/v2/subscription/subscriptions/${encodeURIComponent(
          referenceCode
        )}/cancel`,
        {}
      );
    } catch (err) {
      const subscription = await this.getSubscriptionDetail(referenceCode);
      if (
        subscription?.subscriptionStatus !== 'CANCELED' &&
        subscription?.subscriptionStatus !== 'EXPIRED'
      ) {
        throw err;
      }
    }
  }

  // Yenilemeyi durdurur; kullanım ödemesi alınmış dönemin sonuna kadar sürer.
  // iyzico iptali geri almaya izin vermez, bu yüzden geri açma yoktur. Ortak
  // /billing/cancel ucu "yeniden etkinleştirebilirsiniz" e-postasını cancel_at
  // alanına göre gönderdiği için o alan dönülmez; kullanıcıya doğru bilgi
  // buradan gider.
  override async setToCancel(organizationId: string) {
    const current =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    const checkout = await this._iyzicoRepository.getLastCompletedCheckout(
      organizationId
    );
    if (
      current?.provider !== IYZICO_PROVIDER ||
      !checkout?.subscriptionReferenceCode ||
      current.identifier !== checkout.subscriptionReferenceCode
    ) {
      throw new BadRequestException('No active subscription found');
    }
    if (current.cancelAt) {
      throw new BadRequestException('Subscription is already set to cancel');
    }

    const subscription = await this.getSubscriptionDetail(
      checkout.subscriptionReferenceCode
    );
    await this.cancelAtIyzico(checkout.subscriptionReferenceCode);

    const until = Math.max(
      subscription ? this.paidUntil(subscription) : 0,
      Date.now()
    );
    await this._subscriptionService.updateCancelAt(
      organizationId,
      Math.floor(until / 1000)
    );

    try {
      await this._notificationService.inAppNotification(
        organizationId,
        'Aboneliğiniz iptal edildi',
        `Aboneliğiniz yenilenmeyecek. ${new Date(until).toLocaleDateString(
          'tr-TR',
          { day: 'numeric', month: 'long', year: 'numeric' }
        )} tarihine kadar planınızı kullanmaya devam edebilirsiniz; bu tarihten sonra yeniden abone olabilirsiniz.`,
        true
      );
    } catch (err) {
      // bildirim gönderilemese de iptal geçerlidir
    }

    return { id: checkout.subscriptionReferenceCode, cancelAt: new Date(until) };
  }

  // Hesap silme ve süre bitişi. iyzico'da iptal edilecek abonelik yoksa sessizce
  // geçer; varsa ve iptal edilemiyorsa hata fırlatır (yoksa kart çekilmeye devam ederdi).
  override async cancelAllSubscriptions(organizationId: string) {
    if (!this.isConfigured()) {
      return;
    }
    const checkout = await this._iyzicoRepository.getLastCompletedCheckout(
      organizationId
    );
    if (checkout?.subscriptionReferenceCode) {
      await this.cancelAtIyzico(checkout.subscriptionReferenceCode);
    }
  }

  // Yönetici: hesaba elle plan verir (havale ile ödeyenler için). Bitiş tarihi
  // verilirse plan o tarihte kendiliğinden kapanır. Kartla süren bir abonelik
  // varken verilmez; önce o kaldırılır (yoksa iyzico kartı çekmeye devam ederdi).
  async grantManualPlan(
    organizationId: string,
    billing: Tier,
    period: Period,
    until: Date | null
  ) {
    const current =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    if (current && (current.provider !== IYZICO_PROVIDER || current.isLifetime)) {
      throw new BadRequestException(
        'This subscription is managed by another provider'
      );
    }
    if (
      current &&
      !current.cancelAt &&
      !current.identifier?.startsWith(MANUAL_PLAN_PREFIX)
    ) {
      throw new BadRequestException(
        'Remove the card subscription before giving a plan manually'
      );
    }

    const identifier = MANUAL_PLAN_PREFIX + makeId(10);
    await this._subscriptionService.createOrUpdateSubscriptionByOrg(
      false,
      organizationId,
      IYZICO_PROVIDER,
      identifier,
      pricing[billing].channel!,
      billing,
      period,
      until ? Math.floor(until.getTime() / 1000) : null
    );

    const saved =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    if (saved?.identifier !== identifier) {
      throw new BadRequestException('The plan could not be saved');
    }
    return { success: true };
  }

  // Yönetici: hemen iptal et ve aboneliği kaldır.
  override async cancelSubscription(organizationId: string) {
    await this.cancelAllSubscriptions(organizationId);
    await this._subscriptionService.deleteSubscriptionByOrgId(
      organizationId,
      IYZICO_PROVIDER
    );
    return { success: true };
  }

  private async getCurrentSubscription(organizationId: string) {
    const checkout = await this._iyzicoRepository.getLastCompletedCheckout(
      organizationId
    );
    const current =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    if (
      !checkout?.subscriptionReferenceCode ||
      current?.identifier !== checkout.subscriptionReferenceCode
    ) {
      return undefined;
    }
    return this.getSubscriptionDetail(checkout.subscriptionReferenceCode);
  }

  override async getRenewalDate(organizationId: string) {
    try {
      const subscription = await this.getCurrentSubscription(organizationId);
      if (subscription?.subscriptionStatus !== 'ACTIVE') {
        return { renewsAt: null, trialing: false };
      }
      const until = this.paidUntil(subscription);
      return {
        renewsAt: until ? Math.floor(until / 1000) : null,
        trialing: (subscription.trialEndDate || 0) > Date.now(),
      };
    } catch (err) {
      return { renewsAt: null, trialing: false };
    }
  }

  // Ödeme geçmişi. Bunlar tahsilat kayıtlarıdır; fatura ayrıca kesilir.
  override async getInvoices(organizationId: string): Promise<PaymentInvoice[]> {
    const subscription = await this.getCurrentSubscription(organizationId);
    const plan = this.findPlanByCode(subscription?.pricingPlanReferenceCode);

    return (subscription?.orders || [])
      .filter((order) => order.orderStatus !== 'WAITING')
      .sort((a, b) => b.startPeriod - a.startPeriod)
      .map((order) => ({
        id: order.referenceCode,
        number: null,
        tier: plan?.billing || null,
        period: plan?.period || null,
        description: null,
        amount: Math.round(Number(order.price || 0) * 100),
        currency: String(order.currencyCode || 'TRY').toLowerCase(),
        created: Math.floor(order.startPeriod / 1000),
        periodEnd: Math.floor(order.endPeriod / 1000),
        status: order.orderStatus === 'SUCCESS' ? 'paid' : 'failed',
        downloadUrl: null,
        viewUrl: null,
      }));
  }
}
