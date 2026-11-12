import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

const brandSelect = { name: true, logo: true, color: true } as const;

@Injectable()
export class BrandRepository {
  constructor(private _brand: PrismaRepository<'agencyBrand'>) {}

  getBrand(organizationId: string) {
    return this._brand.model.agencyBrand.findUnique({
      where: { organizationId },
      select: brandSelect,
    });
  }

  saveBrand(
    organizationId: string,
    values: { name: string | null; logo: string | null; color: string | null }
  ) {
    return this._brand.model.agencyBrand.upsert({
      where: { organizationId },
      update: values,
      create: { organizationId, ...values },
      select: brandSelect,
    });
  }
}
