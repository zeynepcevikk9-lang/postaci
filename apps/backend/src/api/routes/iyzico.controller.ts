import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization, User } from '@prisma/client';
import { Response } from 'express';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { IyzicoProvider } from '@gitroom/nestjs-libraries/services/payment/providers/iyzico.provider';
import { IyzicoCheckoutDto } from '@gitroom/nestjs-libraries/dtos/billing/iyzico.checkout.dto';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';

// Postacı: iyzico ile TL abonelik (giriş yapmış kullanıcı). İptal, yenileme
// tarihi ve ödeme geçmişi ortak /billing uç noktalarından sağlayıcıya ulaşır.
@ApiTags('Billing')
@Controller('/iyzico')
export class IyzicoController {
  constructor(
    private _iyzicoProvider: IyzicoProvider,
    private _usersService: UsersService
  ) {}

  @Get('/plans')
  getPlans(@GetOrgFromRequest() org: Organization) {
    return this._iyzicoProvider.getPlans(org.allowTrial);
  }

  @Post('/checkout')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async checkout(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: IyzicoCheckoutDto
  ) {
    // Aynı e-postayla başka bir hesapta etkin abonelik varsa ikincisi açılmaz
    // (ortak /billing/subscribe ile aynı kural).
    if (
      await this._usersService.getUserWithActiveSubscriptionByEmail(
        user.email,
        user.id
      )
    ) {
      return { blocked: true };
    }
    return this._iyzicoProvider.checkout(org.id, org.allowTrial, user, body);
  }
}

// iyzico, ödeme formu bitince tarayıcıyı buraya gönderir (form gövdesinde
// yalnızca form anahtarı vardır). Sonuç iyzico'ya sorulur, kullanıcı panele döner.
@ApiTags('Public')
@Controller('/public/iyzico')
export class IyzicoPublicController {
  constructor(private _iyzicoProvider: IyzicoProvider) {}

  @Post('/callback')
  async callback(@Body('token') token: string, @Res() res: Response) {
    const active = await this._iyzicoProvider.completeCheckout(
      typeof token === 'string' ? token : ''
    );
    res.redirect(
      303,
      `${process.env.FRONTEND_URL}/billing?iyzico=${
        active ? 'success' : 'failed'
      }`
    );
  }
}
