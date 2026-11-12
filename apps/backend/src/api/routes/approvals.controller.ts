import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { ApprovalService } from '@gitroom/nestjs-libraries/database/prisma/approvals/approval.service';
import { CreateApprovalPlanDto } from '@gitroom/nestjs-libraries/dtos/approvals/approval.dto';

// Postacı: ajansın (giriş yapmış kullanıcının) toplu onay planı oluşturması.
@ApiTags('Approvals')
@Controller('/approvals')
export class ApprovalsController {
  constructor(private _approvalService: ApprovalService) {}

  @Post('/plans')
  async createPlan(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateApprovalPlanDto
  ) {
    return this._approvalService.createPlan(org.id, body);
  }
}
