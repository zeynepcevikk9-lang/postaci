import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

const requestSelect = {
  id: true,
  organizationId: true,
  billing: true,
  period: true,
  amount: true,
  code: true,
  status: true,
  createdAt: true,
} as const;

// Postacı: havale / EFT ödeme bildirimleri. Kullanıcı "havaleyi yaptım" der,
// yönetici ödemeyi görünce onaylar ve plan elle tanımlanır.
@Injectable()
export class BankTransferRepository {
  constructor(
    private _requests: PrismaRepository<'bankTransferRequest'>,
    private _organization: PrismaRepository<'organization'>
  ) {}

  getPending(organizationId: string) {
    return this._requests.model.bankTransferRequest.findFirst({
      where: { organizationId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: requestSelect,
    });
  }

  // Hesabın tek bir bekleyen bildirimi olur; yenisi eskisinin yerine geçer.
  async savePending(
    organizationId: string,
    userId: string,
    values: { billing: string; period: string; amount: number; code: string }
  ) {
    const current = await this.getPending(organizationId);
    if (current) {
      return this._requests.model.bankTransferRequest.update({
        where: { id: current.id },
        data: { ...values, userId, createdAt: new Date() },
        select: requestSelect,
      });
    }
    return this._requests.model.bankTransferRequest.create({
      data: { organizationId, userId, ...values },
      select: requestSelect,
    });
  }

  getRequest(id: string) {
    return this._requests.model.bankTransferRequest.findUnique({
      where: { id },
      select: requestSelect,
    });
  }

  listPending() {
    return this._requests.model.bankTransferRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: requestSelect,
    });
  }

  // Yalnızca hâlâ bekleyen bildirim karara bağlanır (iki kez onaylanmasın).
  async decide(id: string, status: 'APPROVED' | 'REJECTED') {
    const { count } = await this._requests.model.bankTransferRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status, decidedAt: new Date() },
    });
    return count === 1;
  }

  reopen(id: string) {
    return this._requests.model.bankTransferRequest.updateMany({
      where: { id },
      data: { status: 'PENDING', decidedAt: null },
    });
  }

  // Yönetim listesinde gösterilecek hesap adı ve sahibinin e-postası.
  getOrganizations(ids: string[]) {
    return this._organization.model.organization.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        users: {
          where: { disabled: false },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { user: { select: { email: true } } },
        },
      },
    });
  }
}
