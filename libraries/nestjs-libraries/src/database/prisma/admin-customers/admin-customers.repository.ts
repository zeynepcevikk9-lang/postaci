import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

export interface CustomersParams {
  page: number;
  limit: number;
  search?: string;
  // 'FREE' = aboneliği olmayanlar; diğerleri abonelik kademesi
  plan?: string;
}

const PLANS = ['STANDARD', 'TEAM', 'PRO', 'ULTIMATE'];

// Postacı: yönetim panelindeki müşteri (hesap) listesi. Yalnızca listede
// gösterilen alanlar seçilir; kullanıcı ve kanal kayıtları ham dönmez.
@Injectable()
export class AdminCustomersRepository {
  constructor(
    private _organization: PrismaRepository<'organization'>,
    private _subscription: PrismaRepository<'subscription'>
  ) {}

  private where(params: CustomersParams): Prisma.OrganizationWhereInput {
    const search = params.search?.trim();
    return {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              {
                users: {
                  some: {
                    user: { email: { contains: search, mode: 'insensitive' } },
                  },
                },
              },
            ],
          }
        : {}),
      ...(params.plan === 'FREE'
        ? { subscription: null }
        : PLANS.includes(params.plan || '')
        ? {
            subscription: {
              deletedAt: null,
              subscriptionTier: params.plan as any,
            },
          }
        : {}),
    };
  }

  async list(params: CustomersParams) {
    const where = this.where(params);
    const [total, rows] = await Promise.all([
      this._organization.model.organization.count({ where }),
      this._organization.model.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.page * params.limit,
        take: params.limit,
        select: {
          id: true,
          name: true,
          createdAt: true,
          isTrailing: true,
          subscription: {
            select: {
              subscriptionTier: true,
              period: true,
              provider: true,
              cancelAt: true,
              isLifetime: true,
              createdAt: true,
            },
          },
          users: {
            where: { disabled: false },
            orderBy: { createdAt: 'asc' },
            select: {
              role: true,
              user: {
                select: { id: true, email: true, name: true, lastOnline: true },
              },
            },
          },
          _count: {
            select: {
              Integration: { where: { deletedAt: null } },
              post: { where: { deletedAt: null, parentPostId: null } },
              customers: true,
            },
          },
        },
      }),
    ]);

    return { total, rows };
  }

  async summary() {
    const [accounts, byPlan, trialing, cancelling] = await Promise.all([
      this._organization.model.organization.count({
        where: { deletedAt: null },
      }),
      this._subscription.model.subscription.groupBy({
        by: ['subscriptionTier'],
        where: { deletedAt: null, organization: { deletedAt: null } },
        _count: { _all: true },
      }),
      this._subscription.model.subscription.count({
        where: {
          deletedAt: null,
          organization: { deletedAt: null, isTrailing: true },
        },
      }),
      this._subscription.model.subscription.count({
        where: {
          deletedAt: null,
          cancelAt: { not: null },
          organization: { deletedAt: null },
        },
      }),
    ]);

    return { accounts, byPlan, trialing, cancelling };
  }

  // Ödeme alınan abonelikler (deneme ve bitecek olanlar hariç), kademe ve döneme göre.
  payingByPlan(provider: string) {
    return this._subscription.model.subscription.groupBy({
      by: ['subscriptionTier', 'period'],
      where: {
        provider,
        deletedAt: null,
        isLifetime: false,
        cancelAt: null,
        organization: { deletedAt: null, isTrailing: false },
      },
      _count: { _all: true },
    });
  }
}
