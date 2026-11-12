import { IsDateString, IsIn, IsOptional } from 'class-validator';

// Postacı: yönetim panelinden hesaba elle plan verme ya da planı kaldırma.
export class AdminSetPlanDto {
  // FREE = aboneliği kaldır
  @IsIn(['FREE', 'STANDARD', 'TEAM', 'PRO', 'ULTIMATE'])
  plan: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE';

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  period?: 'MONTHLY' | 'YEARLY';

  // Planın biteceği gün; boşsa plan elle kaldırılana kadar sürer.
  @IsOptional()
  @IsDateString()
  until?: string;
}
