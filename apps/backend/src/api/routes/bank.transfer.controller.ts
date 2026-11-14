import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { BankTransferService } from '@gitroom/nestjs-libraries/database/prisma/bank-transfer/bank.transfer.service';
import { BankTransferRequestDto } from '@gitroom/nestjs-libraries/dtos/billing/bank.transfer.dto';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';

// Postacı: havale / EFT ödeme bildirimi (giriş yapmış kullanıcı).
@ApiTags('Billing')
@Controller('/bank-transfer')
export class BankTransferController {
  constructor(private _bankTransferService: BankTransferService) {}

  @Post('/requests')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  createRequest(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: BankTransferRequestDto
  ) {
    return this._bankTransferService.createRequest(org, user.id, body);
  }
}

// Yönetim paneli: bekleyen havale bildirimleri. Yalnızca süper yönetici.
@ApiTags('Admin')
@Controller('/admin/transfers')
export class AdminTransfersController {
  constructor(private _bankTransferService: BankTransferService) {}

  private assertSuperAdmin(user: User) {
    if (!user?.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }
  }

  @Get('/')
  list(@GetUserFromRequest() user: User) {
    this.assertSuperAdmin(user);
    return this._bankTransferService.listPending();
  }

  @Post('/:id/approve')
  approve(@GetUserFromRequest() user: User, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    console.log('admin_transfer_approve', { admin_id: user.id, request_id: id });
    return this._bankTransferService.approve(id);
  }

  @Post('/:id/reject')
  reject(@GetUserFromRequest() user: User, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    console.log('admin_transfer_reject', { admin_id: user.id, request_id: id });
    return this._bankTransferService.reject(id);
  }
}
