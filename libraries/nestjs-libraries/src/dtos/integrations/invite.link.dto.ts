import { IsDefined, IsString, MaxLength } from 'class-validator';

// Postacı: paneldeki davet bağlantısı için kanal türü. Türün bağlantıyla
// bağlanabilir olup olmadığını servis (createConnectLink) denetler.
export class InviteLinkDto {
  @IsDefined()
  @IsString()
  @MaxLength(60)
  integration: string;
}
