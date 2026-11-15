import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Postacı: yönetim panelinde hesaba yazılan not. Yalnızca yönetici görür.
export class AdminNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}
