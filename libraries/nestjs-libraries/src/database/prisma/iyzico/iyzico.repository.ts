import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

// Postacı: iyzico ödeme formu kayıtları. Abonelik iyzico'da başlayınca iyzico'nun
// abonelik ve müşteri referans kodları buraya yazılır; webhook geldiğinde hangi
// organizasyona ait olduğu buradan bulunur.
@Injectable()
export class IyzicoRepository {
  constructor(
    private _checkout: PrismaRepository<'iyzicoCheckout'>,
    private _subscription: PrismaRepository<'subscription'>
  ) {}

  createCheckout(
    organizationId: string,
    userId: string,
    token: string,
    billing: string,
    period: string
  ) {
    return this._checkout.model.iyzicoCheckout.create({
      data: { organizationId, userId, token, billing, period },
      select: { id: true },
    });
  }

  getCheckoutByToken(token: string) {
    return this._checkout.model.iyzicoCheckout.findUnique({
      where: { token },
    });
  }

  completeCheckout(
    id: string,
    subscriptionReferenceCode: string,
    customerReferenceCode: string | null
  ) {
    return this._checkout.model.iyzicoCheckout.update({
      where: { id },
      data: {
        subscriptionReferenceCode,
        customerReferenceCode,
        completedAt: new Date(),
      },
      select: { id: true },
    });
  }

  // Ödeme dönüşü bize ulaşmamış olabilecek formlar (başlatılmış, tamamlanmamış).
  getPendingCheckouts(from: Date, to: Date) {
    return this._checkout.model.iyzicoCheckout.findMany({
      where: { completedAt: null, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Aboneliği iyzico'da iptal edilmiş, izlenmeyecek form.
  discardCheckout(id: string) {
    return this._checkout.model.iyzicoCheckout.delete({
      where: { id },
      select: { id: true },
    });
  }

  // Organizasyonun son tamamlanan ödeme formu = güncel iyzico aboneliği.
  getLastCompletedCheckout(organizationId: string) {
    return this._checkout.model.iyzicoCheckout.findFirst({
      where: { organizationId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
    });
  }

  getCheckoutBySubscription(subscriptionReferenceCode: string) {
    return this._checkout.model.iyzicoCheckout.findFirst({
      where: { subscriptionReferenceCode },
      orderBy: { completedAt: 'desc' },
    });
  }

  // Bitiş tarihi geçmiş abonelikler (iptal edilmiş ya da ödemesi alınamamış).
  getExpiredSubscriptions(provider: string) {
    return this._subscription.model.subscription.findMany({
      where: {
        provider,
        deletedAt: null,
        isLifetime: false,
        cancelAt: { lt: new Date() },
      },
      select: { organizationId: true },
    });
  }
}
