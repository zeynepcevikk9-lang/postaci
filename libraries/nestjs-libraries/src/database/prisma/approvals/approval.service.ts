import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalRepository } from '@gitroom/nestjs-libraries/database/prisma/approvals/approval.repository';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { CreateApprovalDto } from '@gitroom/nestjs-libraries/dtos/approvals/approval.dto';

@Injectable()
export class ApprovalService {
  constructor(
    private _approvalRepository: ApprovalRepository,
    private _postsService: PostsService,
    private _notificationService: NotificationService
  ) {}

  // Önizleme bağlantısındaki ana gönderi; bağlantı geçersizse bulunamadı döner.
  private async getPreviewRoot(previewId: string) {
    const posts = await this._postsService.getPostsRecursively(
      previewId,
      false
    );
    if (!posts.length) {
      throw new NotFoundException('Post not found');
    }
    return posts[0];
  }

  async getApproval(previewId: string) {
    const root = await this.getPreviewRoot(previewId);
    const history = await this._approvalRepository.getApprovalsForPost(
      root.id
    );

    return {
      status: history[0]?.status || 'PENDING',
      current: history[0] || null,
      history,
    };
  }

  async createApproval(previewId: string, body: CreateApprovalDto) {
    const root = await this.getPreviewRoot(previewId);
    const reviewerName = body.reviewerName.trim();
    const note = body.note?.trim() || undefined;

    if (!reviewerName) {
      throw new BadRequestException('Name is required');
    }
    if (body.status === 'CHANGES_REQUESTED' && !note) {
      throw new BadRequestException('A note is required to request changes');
    }

    const approval = await this._approvalRepository.createApproval(
      root.organizationId,
      root.id,
      body.status,
      reviewerName,
      note
    );

    // Bildirim gönderilemese de müşterinin kararı kaydedilmiş olmalı.
    try {
      await this._notificationService.inAppNotification(
        root.organizationId,
        body.status === 'APPROVED'
          ? `${reviewerName} gönderiyi onayladı`
          : `${reviewerName} gönderide değişiklik istedi`,
        body.status === 'APPROVED'
          ? `${reviewerName}, paylaştığınız gönderiyi onayladı.`
          : `${reviewerName}, paylaştığınız gönderi için değişiklik istedi: ${note}`,
        true,
        false,
        body.status === 'APPROVED' ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Onay bildirimi gönderilemedi', err);
    }

    return approval;
  }
}
