import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ThrottlerRealIpGuard } from '@gitroom/nestjs-libraries/throttler/throttler.provider';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { BrandService } from '@gitroom/nestjs-libraries/database/prisma/brand/brand.service';
import { BrandDto } from '@gitroom/nestjs-libraries/dtos/brand/brand.dto';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';

// Postacı: ajans markası ayarı (giriş yapmış kullanıcı).
@ApiTags('Brand')
@Controller('/brand')
export class BrandController {
  constructor(private _brandService: BrandService) {}

  @Get('/')
  getBrand(@GetOrgFromRequest() org: Organization) {
    return this._brandService.getBrand(org.id);
  }

  // Marka ve hesap türünü yalnızca hesap yöneticisi değiştirir.
  @Put('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  saveBrand(@GetOrgFromRequest() org: Organization, @Body() body: BrandDto) {
    return this._brandService.saveBrand(org.id, body);
  }
}

// Müşterinin gördüğü sayfalar için: yalnızca ad, logo ve renk döner.
@ApiTags('Public')
@Controller('/public')
@UseGuards(ThrottlerRealIpGuard)
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class BrandPublicController {
  constructor(
    private _brandService: BrandService,
    private _integrationService: IntegrationService
  ) {}

  // Davet bağlantısının sayfası için: bağlantıyı üreten hesabın markası.
  // Bağlantının süresi dolduysa 404 döner.
  @Get('/brand/connect/:token')
  async getConnectLinkBrand(@Param('token') token: string) {
    const organizationId =
      await this._integrationService.getConnectLinkOrganization(token);
    const { name, logo, color } = await this._brandService.getBrand(
      organizationId
    );
    return { name, logo, color };
  }

  // Müşterinin gördüğü sayfalar için: hesap türü gibi iç ayarlar dönmez.
  @Get('/brand/:organizationId')
  async getBrand(@Param('organizationId') organizationId: string) {
    const { name, logo, color } = await this._brandService.getBrand(
      organizationId
    );
    return { name, logo, color };
  }
}
