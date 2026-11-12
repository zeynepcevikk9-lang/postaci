import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

// E-ticaret mağazasının ürün XML'i (ikas, Ticimax, T-Soft, IdeaSoft ve benzeri
// platformların dışa aktardığı ürün listesi adresi).
export class CreateProductFeedDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsUrl({ require_protocol: true, require_tld: false })
  @MaxLength(1000)
  url: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}
