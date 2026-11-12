import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ApprovalDecision } from '@gitroom/nestjs-libraries/dtos/approvals/approval.dto';

const approvalSelect = {
  id: true,
  postId: true,
  status: true,
  reviewerName: true,
  note: true,
  createdAt: true,
} as const;

@Injectable()
export class ApprovalRepository {
  constructor(
    private _approvals: PrismaRepository<'postApproval'>,
    private _plans: PrismaRepository<'approvalPlan'>,
    private _post: PrismaRepository<'post'>,
    private _customers: PrismaRepository<'customer'>
  ) {}

  getApprovalsForPost(postId: string) {
    return this._approvals.model.postApproval.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: approvalSelect,
    });
  }

  // En yeni karar başta gelir; her gönderinin güncel durumu ilk satırıdır.
  getApprovalsForPosts(postIds: string[]) {
    return this._approvals.model.postApproval.findMany({
      where: { postId: { in: postIds } },
      orderBy: { createdAt: 'desc' },
      select: approvalSelect,
    });
  }

  // Takvim rozetleri için: yalnızca bu kuruluşun kararları döner.
  getApprovalsForOrgPosts(organizationId: string, postIds: string[]) {
    return this._approvals.model.postApproval.findMany({
      where: { organizationId, postId: { in: postIds } },
      orderBy: { createdAt: 'desc' },
      select: { postId: true, status: true },
    });
  }

  createApproval(
    organizationId: string,
    postId: string,
    status: ApprovalDecision,
    reviewerName: string,
    note?: string
  ) {
    return this._approvals.model.postApproval.create({
      data: { organizationId, postId, status, reviewerName, note },
      select: approvalSelect,
    });
  }

  createApprovals(
    organizationId: string,
    postIds: string[],
    status: ApprovalDecision,
    reviewerName: string,
    note?: string
  ) {
    return this._approvals.model.postApproval.createMany({
      data: postIds.map((postId) => ({
        organizationId,
        postId,
        status,
        reviewerName,
        note,
      })),
    });
  }

  getCustomer(organizationId: string, customerId: string) {
    return this._customers.model.customer.findFirst({
      where: { id: customerId, orgId: organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  createPlan(
    organizationId: string,
    from: Date,
    to: Date,
    customer?: { id: string; name: string },
    autoSchedule = false
  ) {
    return this._plans.model.approvalPlan.create({
      data: {
        organizationId,
        from,
        to,
        customerId: customer?.id,
        customerName: customer?.name,
        autoSchedule,
      },
      select: { id: true },
    });
  }

  getPlan(id: string) {
    return this._plans.model.approvalPlan.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        customerId: true,
        customerName: true,
        autoSchedule: true,
        from: true,
        to: true,
      },
    });
  }

  // Planın kapsadığı ana gönderiler: taslak ve zamanlanmış olanlar. Kanalın
  // yalnızca müşteriye gösterilecek alanları seçilir (erişim anahtarı seçilmez).
  getPlanPosts(
    organizationId: string,
    from: Date,
    to: Date,
    customerId?: string | null
  ) {
    return this._post.model.post.findMany({
      where: {
        organizationId,
        deletedAt: null,
        parentPostId: null,
        state: { in: ['QUEUE', 'DRAFT'] },
        publishDate: { gte: from, lte: to },
        integration: {
          deletedAt: null,
          ...(customerId ? { customerId } : {}),
        },
      },
      orderBy: { publishDate: 'asc' },
      take: 400,
      select: {
        id: true,
        group: true,
        content: true,
        image: true,
        publishDate: true,
        state: true,
        integration: {
          select: {
            id: true,
            name: true,
            picture: true,
            providerIdentifier: true,
            profile: true,
          },
        },
      },
    });
  }
}
