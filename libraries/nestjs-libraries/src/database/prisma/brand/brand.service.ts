import { Injectable } from '@nestjs/common';
import { BrandRepository } from '@gitroom/nestjs-libraries/database/prisma/brand/brand.repository';
import { BrandDto } from '@gitroom/nestjs-libraries/dtos/brand/brand.dto';

export interface Brand {
  name: string | null;
  logo: string | null;
  color: string | null;
  accountType: string;
}

const emptyBrand: Brand = {
  name: null,
  logo: null,
  color: null,
  accountType: 'agency',
};

@Injectable()
export class BrandService {
  constructor(private _brandRepository: BrandRepository) {}

  // Marka ayarlanmamışsa alanları boş döner; sayfalar o durumda Postacı
  // varsayılanını gösterir.
  async getBrand(organizationId: string): Promise<Brand> {
    return (await this._brandRepository.getBrand(organizationId)) || emptyBrand;
  }

  saveBrand(organizationId: string, body: BrandDto): Promise<Brand> {
    return this._brandRepository.saveBrand(organizationId, {
      name: body.name?.trim() || null,
      logo: body.logo?.trim() || null,
      color: body.color?.trim() || null,
      // gönderilmediyse kayıtlı tür değişmez
      ...(body.accountType ? { accountType: body.accountType } : {}),
    });
  }
}
