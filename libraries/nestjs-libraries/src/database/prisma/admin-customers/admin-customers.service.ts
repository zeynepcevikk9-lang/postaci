import { Injectable } from '@nestjs/common';
import {
  AdminCustomersRepository,
  CustomersParams,
} from '@gitroom/nestjs-libraries/database/prisma/admin-customers/admin-customers.repository';
import {
  IYZICO_PROVIDER,
  IyzicoProvider,
} from '@gitroom/nestjs-libraries/services/payment/providers/iyzico.provider';

@Injectable()
export class AdminCustomersService {
  constructor(
    private _adminCustomersRepository: AdminCustomersRepository,
    private _iyzicoProvider: IyzicoProvider
  ) {}

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
          IYZICO_PROVIDER
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
