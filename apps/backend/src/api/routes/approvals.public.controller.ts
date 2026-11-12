import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
@ApiTags('Public')
@Controller('/public')
export class ApprovalsPublicController {
  constructor(private _approvalService: ApprovalService) {}

  @Get('/posts/:id/approval')
  async getApproval(@Param('id') previewId: string) {
    return this._approvalService.getApproval(previewId);
  }

  @Post('/posts/:id/approval')
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

  @Post('/plans/:id/decision')
  async decidePlanItem(
    @Param('id') planId: string,
    @Body() body: PlanDecisionDto
  ) {
    return this._approvalService.decidePlanItem(planId, body);
  }

  @Post('/plans/:id/approve-all')
  async approveAll(
    @Param('id') planId: string,
    @Body() body: PlanApproveAllDto
  ) {
    return this._approvalService.approveAll(planId, body);
  }
}
