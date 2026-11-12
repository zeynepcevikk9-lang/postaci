import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Ajans markası. Boş bırakılan alan temizlenir (Postacı varsayılanı kullanılır).
export class BrandDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  // Yüklenen görselin yolu (/uploads/...) ya da tam adresi.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^$|^(https?:\/\/|\/)[^\s"'<>]+$/, {
    message: 'logo must be an uploaded file path or an http(s) URL',
  })
  logo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^#[0-9a-fA-F]{6}$/, { message: 'color must be like #3D4FE0' })
  color?: string;
}
