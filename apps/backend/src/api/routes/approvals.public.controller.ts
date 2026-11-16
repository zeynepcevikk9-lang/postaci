import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ThrottlerRealIpGuard } from '@gitroom/nestjs-libraries/throttler/throttler.provider';
import { ApiTags } from '@nestjs/swagger';
import { ApprovalService } from '@gitroom/nestjs-libraries/database/prisma/approvals/approval.service';
import {
  CreateApprovalDto,
  PlanApproveAllDto,
  PlanDecisionDto,
} from '@gitroom/nestjs-libraries/dtos/approvals/approval.dto';

// Postacı: müşteri onayı. Önizleme ya da plan bağlantısını bilen herkes (müşteri)
// giriş yapmadan onay durumunu görebilir ve karar bildirebilir; önizleme
// yorumlarıyla aynı erişim kuralı.
// Giriş gerektirmeyen uç noktalar: IP başına sınır (yazma isteklerinde e-posta
// gönderildiği için daha sıkı).
@ApiTags('Public')
@Controller('/public')
@UseGuards(ThrottlerRealIpGuard)
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class ApprovalsPublicController {
  constructor(private _approvalService: ApprovalService) {}

  @Get('/posts/:id/approval')
  async getApproval(@Param('id') previewId: string) {
    return this._approvalService.getApproval(previewId);
  }

  @Post('/posts/:id/approval')
  @Throttle({ default: { limit: 20, ttl: 600000 } })
  async createApproval(
    @Param('id') previewId: string,
    @Body() body: CreateApprovalDto
  ) {
    return this._approvalService.createApproval(previewId, body);
  }

  @Get('/plans/:id')
  async getPlan(@Param('id') planId: string) {
    return this._approvalService.getPlan(planId);
  }

  // Aylık rapor: oluşturulduğu andaki veriler.
  @Get('/reports/:id')
  async getReport(@Param('id') reportId: string) {
    return this._approvalService.getReport(reportId);
  }

  @Post('/plans/:id/decision')
  @Throttle({ default: { limit: 40, ttl: 600000 } })
  async decidePlanItem(
    @Param('id') planId: string,
    @Body() body: PlanDecisionDto
  ) {
    return this._approvalService.decidePlanItem(planId, body);
  }

  @Post('/plans/:id/approve-all')
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  async approveAll(
    @Param('id') planId: string,
    @Body() body: PlanApproveAllDto
  ) {
    return this._approvalService.approveAll(planId, body);
  }
}
