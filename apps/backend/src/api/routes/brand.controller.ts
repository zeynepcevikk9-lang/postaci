import { Body, Controller, Get, Param, Put } from '@nestjs/common';
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

  @Put('/')
  saveBrand(@GetOrgFromRequest() org: Organization, @Body() body: BrandDto) {
    return this._brandService.saveBrand(org.id, body);
  }
}

// Müşterinin gördüğü sayfalar için: yalnızca ad, logo ve renk döner.
@ApiTags('Public')
@Controller('/public')
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

  @Get('/brand/:organizationId')
  getBrand(@Param('organizationId') organizationId: string) {
    return this._brandService.getBrand(organizationId);
  }
}
