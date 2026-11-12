import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ApprovalDecision } from '@gitroom/nestjs-libraries/dtos/approvals/approval.dto';

@Injectable()
export class ApprovalRepository {
  constructor(private _approvals: PrismaRepository<'postApproval'>) {}

  getApprovalsForPost(postId: string) {
    return this._approvals.model.postApproval.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        reviewerName: true,
        note: true,
        createdAt: true,
      },
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
      select: {
        id: true,
        status: true,
        reviewerName: true,
        note: true,
        createdAt: true,
      },
    });
  }
}
