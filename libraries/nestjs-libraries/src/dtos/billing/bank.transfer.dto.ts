import { IsIn } from 'class-validator';

// Postacı: havale / EFT ödeme bildirimi. Tutar gönderilmez; plandan okunur.
export class BankTransferRequestDto {
  @IsIn(['MONTHLY', 'YEARLY'])
  period: 'MONTHLY' | 'YEARLY';

  @IsIn(['STANDARD', 'PRO', 'TEAM', 'ULTIMATE'])
  billing: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';
}
