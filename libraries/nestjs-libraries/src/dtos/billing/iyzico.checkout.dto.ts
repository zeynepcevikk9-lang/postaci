import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Postacı: iyzico abonelik ödeme formunu başlatmak için gereken bilgiler.
// iyzico, aboneyi kendi tarafında bu bilgilerle kaydeder; bizde saklanmaz.
export class IyzicoCheckoutDto {
  @IsIn(['MONTHLY', 'YEARLY'])
  period: 'MONTHLY' | 'YEARLY';

  @IsIn(['STANDARD', 'PRO', 'TEAM', 'ULTIMATE'])
  billing: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  surname: string;

  @Matches(/^\+90\d{10}$/, { message: 'gsmNumber must be like +905xxxxxxxxx' })
  gsmNumber: string;

  @Matches(/^\d{11}$/, { message: 'identityNumber must be 11 digits' })
  identityNumber: string;

  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  city: string;
}
