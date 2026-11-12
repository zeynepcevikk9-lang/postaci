import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalRepository } from '@gitroom/nestjs-libraries/database/prisma/approvals/approval.repository';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import {
  ApprovalDecision,
  CreateApprovalDto,
  CreateApprovalPlanDto,
  PlanApproveAllDto,
  PlanDecisionDto,
} from '@gitroom/nestjs-libraries/dtos/approvals/approval.dto';
import { postContentPlainText } from '@gitroom/helpers/utils/sanitize.post.content';

type ApprovalStatus = ApprovalDecision | 'PENDING';

// Bir plan en fazla bu kadar günü kapsayabilir (iki ay ve biraz pay).
const MAX_PLAN_DAYS = 63;

@Injectable()
export class ApprovalService {
  constructor(
    private _approvalRepository: ApprovalRepository,
    private _postsService: PostsService,
    private _notificationService: NotificationService
  ) {}

  // Bildirim gönderilemese de müşterinin kararı kaydedilmiş olmalı.
  private async notify(
    organizationId: string,
    subject: string,
    message: string,
    approved: boolean
  ) {
    try {
      await this._notificationService.inAppNotification(
        organizationId,
        subject,
        message,
        true,
        false,
        approved ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Onay bildirimi gönderilemedi', err);
    }
  }

  private cleanDecision(body: CreateApprovalDto) {
    const reviewerName = body.reviewerName.trim();
    const note = body.note?.trim() || undefined;
    if (!reviewerName) {
      throw new BadRequestException('Name is required');
    }
    if (body.status === 'CHANGES_REQUESTED' && !note) {
      throw new BadRequestException('A note is required to request changes');
    }
    return { reviewerName, note };
  }

  // ---- Tek gönderi (önizleme sayfası) ----

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
      status: (history[0]?.status || 'PENDING') as ApprovalStatus,
      current: history[0] || null,
      history,
    };
  }

  async createApproval(previewId: string, body: CreateApprovalDto) {
    const root = await this.getPreviewRoot(previewId);
    const { reviewerName, note } = this.cleanDecision(body);

    const approval = await this._approvalRepository.createApproval(
      root.organizationId,
      root.id,
      body.status,
      reviewerName,
      note
    );

    const approved = body.status === 'APPROVED';
    await this.notify(
      root.organizationId,
      approved
        ? `${reviewerName} gönderiyi onayladı`
        : `${reviewerName} gönderide değişiklik istedi`,
      approved
        ? `${reviewerName}, paylaştığınız gönderiyi onayladı.`
        : `${reviewerName}, paylaştığınız gönderi için değişiklik istedi: ${note}`,
      approved
    );

    return approval;
  }

  // ---- Toplu onay planı ----

  async createPlan(organizationId: string, body: CreateApprovalPlanDto) {
    const from = new Date(body.from);
    const to = new Date(body.to);
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    if (!(days > 0) || days > MAX_PLAN_DAYS) {
      throw new BadRequestException('Invalid date range');
    }

    let customer: { id: string; name: string } | undefined;
    if (body.customerId) {
      const found = await this._approvalRepository.getCustomer(
        organizationId,
        body.customerId
      );
      if (!found) {
        throw new BadRequestException('Customer not found');
      }
      customer = found;
    }

    return this._approvalRepository.createPlan(
      organizationId,
      from,
      to,
      customer,
      !!body.autoSchedule
    );
  }

  // Takvim rozetleri: her gönderinin en son kararı. Kararı olmayan gönderi
  // sonuçta yer almaz (onay bekliyor ya da onaya hiç gönderilmemiş).
  async getStatuses(organizationId: string, postIds: string[]) {
    if (!postIds.length) {
      return {};
    }
    const approvals = await this._approvalRepository.getApprovalsForOrgPosts(
      organizationId,
      postIds
    );
    const statuses: Record<string, ApprovalDecision> = {};
    for (const approval of approvals) {
      if (!statuses[approval.postId]) {
        statuses[approval.postId] = approval.status;
      }
    }
    return statuses;
  }

  // Planında "otomatik zamanla" açıksa karar gönderinin durumuna yansır:
  // onaylanan taslak zamanlanır, değişiklik istenen zamanlanmış gönderi taslağa
  // döner. Tarihi geçmiş taslak zamanlanmaz; zamanlanırsa hemen yayımlanırdı.
  private async applyDecisionToPosts(
    organizationId: string,
    posts: { id: string; state: string; publishDate: Date }[],
    status: ApprovalDecision
  ) {
    for (const post of posts) {
      try {
        if (
          status === 'APPROVED' &&
          post.state === 'DRAFT' &&
          post.publishDate.getTime() > Date.now()
        ) {
          await this._postsService.changePostStatus(
            organizationId,
            post.id,
            'schedule'
          );
        }
        if (status === 'CHANGES_REQUESTED' && post.state === 'QUEUE') {
          await this._postsService.changePostStatus(
            organizationId,
            post.id,
            'draft'
          );
        }
      } catch (err) {
        console.error('Onay sonrası gönderi durumu değiştirilemedi', post.id, err);
      }
    }
  }

  // Plan ve kalemleri. Aynı içeriğin birden çok kanala giden kopyaları (aynı
  // "group") müşteriye tek kalem olarak gösterilir.
  private async loadPlan(planId: string) {
    const plan = await this._approvalRepository.getPlan(planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const posts = await this._approvalRepository.getPlanPosts(
      plan.organizationId,
      plan.from,
      plan.to,
      plan.customerId
    );
    const approvals = posts.length
      ? await this._approvalRepository.getApprovalsForPosts(
          posts.map((p) => p.id)
        )
      : [];

    // approvals en yeniden eskiye sıralı: her gönderi için ilk görülen günceldir.
    const latestByPost = new Map<string, (typeof approvals)[number]>();
    for (const approval of approvals) {
      if (!latestByPost.has(approval.postId)) {
        latestByPost.set(approval.postId, approval);
      }
    }

    const groups = new Map<string, typeof posts>();
    for (const post of posts) {
      const list = groups.get(post.group) || [];
      list.push(post);
      groups.set(post.group, list);
    }

    const items = [...groups.entries()].map(([group, groupPosts]) => {
      const latest = groupPosts
        .map((p) => latestByPost.get(p.id))
        .filter((a): a is NonNullable<typeof a> => !!a);
      const status: ApprovalStatus = latest.some(
        (a) => a.status === 'CHANGES_REQUESTED'
      )
        ? 'CHANGES_REQUESTED'
        : latest.length === groupPosts.length &&
          latest.every((a) => a.status === 'APPROVED')
        ? 'APPROVED'
        : 'PENDING';
      const current =
        [...latest].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )[0] || null;

      let images: { path: string }[] = [];
      try {
        images = JSON.parse(groupPosts[0].image || '[]');
      } catch (err) {
        images = [];
      }

      return {
        group,
        postIds: groupPosts.map((p) => p.id),
        posts: groupPosts.map((p) => ({
          id: p.id,
          state: p.state,
          publishDate: p.publishDate,
        })),
        previewId: groupPosts[0].id,
        publishDate: groupPosts[0].publishDate,
        text: postContentPlainText(groupPosts[0].content),
        images: images
          .filter((i) => typeof i?.path === 'string')
          .slice(0, 4)
          .map((i) => i.path),
        channels: groupPosts.map((p) => ({
          id: p.integration.id,
          name: p.integration.name,
          picture: p.integration.picture,
          providerIdentifier: p.integration.providerIdentifier,
          profile: p.integration.profile,
        })),
        status,
        current: current
          ? {
              status: current.status,
              reviewerName: current.reviewerName,
              note: current.note,
              createdAt: current.createdAt,
            }
          : null,
      };
    });

    return { plan, items };
  }

  async getPlan(planId: string) {
    const { plan, items } = await this.loadPlan(planId);
    return {
      id: plan.id,
      customerName: plan.customerName,
      from: plan.from,
      to: plan.to,
      // postIds ve posts yalnızca sunucu içinde kullanılır
      items: items.map(({ postIds, posts, ...item }) => item),
    };
  }

  async decidePlanItem(planId: string, body: PlanDecisionDto) {
    const { plan, items } = await this.loadPlan(planId);
    const item = items.find((i) => i.group === body.group);
    if (!item) {
      throw new BadRequestException('Post does not belong to this plan');
    }
    const { reviewerName, note } = this.cleanDecision(body);

    await this._approvalRepository.createApprovals(
      plan.organizationId,
      item.postIds,
      body.status,
      reviewerName,
      note
    );

    if (plan.autoSchedule) {
      await this.applyDecisionToPosts(
        plan.organizationId,
        item.posts,
        body.status
      );
    }

    const approved = body.status === 'APPROVED';
    await this.notify(
      plan.organizationId,
      approved
        ? `${reviewerName} bir gönderiyi onayladı`
        : `${reviewerName} bir gönderide değişiklik istedi`,
      approved
        ? `${reviewerName}, onay planındaki bir gönderiyi onayladı.`
        : `${reviewerName}, onay planındaki bir gönderi için değişiklik istedi: ${note}`,
      approved
    );

    return { success: true };
  }

  // Yalnızca henüz karar verilmemiş kalemleri onaylar; değişiklik istenenlere
  // dokunmaz.
  async approveAll(planId: string, body: PlanApproveAllDto) {
    const { plan, items } = await this.loadPlan(planId);
    const reviewerName = body.reviewerName.trim();
    if (!reviewerName) {
      throw new BadRequestException('Name is required');
    }

    const pending = items.filter((i) => i.status === 'PENDING');
    if (!pending.length) {
      return { approved: 0 };
    }

    await this._approvalRepository.createApprovals(
      plan.organizationId,
      pending.flatMap((i) => i.postIds),
      'APPROVED',
      reviewerName
    );

    if (plan.autoSchedule) {
      await this.applyDecisionToPosts(
        plan.organizationId,
        pending.flatMap((i) => i.posts),
        'APPROVED'
      );
    }

    await this.notify(
      plan.organizationId,
      `${reviewerName} ${pending.length} gönderiyi onayladı`,
      `${reviewerName}, onay planındaki ${pending.length} gönderiyi onayladı.`,
      true
    );

    return { approved: pending.length };
  }
}
