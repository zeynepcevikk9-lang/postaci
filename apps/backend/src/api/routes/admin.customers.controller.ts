import { Controller, Get, HttpException, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { AdminCustomersService } from '@gitroom/nestjs-libraries/database/prisma/admin-customers/admin-customers.service';

// Postacı: yönetim paneli, müşteri (hesap) listesi. Yalnızca süper yönetici.
@ApiTags('Admin')
@Controller('/admin/customers')
export class AdminCustomersController {
  constructor(private _adminCustomersService: AdminCustomersService) {}

  private assertSuperAdmin(user: User) {
    if (!user?.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }
  }

  @Get('/')
  async list(
    @GetUserFromRequest() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('plan') plan?: string
  ) {
    this.assertSuperAdmin(user);
    return this._adminCustomersService.list({
      page: Math.max(0, parseInt(page || '0', 10) || 0),
      limit: Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20)),
      search: search ? String(search).slice(0, 100) : undefined,
      plan: plan || undefined,
    });
  }

  @Get('/summary')
  async summary(@GetUserFromRequest() user: User) {
    this.assertSuperAdmin(user);
    return this._adminCustomersService.summary();
  }
}
