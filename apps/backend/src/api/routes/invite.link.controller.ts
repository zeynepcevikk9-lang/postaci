import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { InviteLinkDto } from '@gitroom/nestjs-libraries/dtos/integrations/invite.link.dto';

// Postacı: paneldeki "davet bağlantısı". Müşteriye gönderilen bağlantı doğrudan
// sosyal ağın izin ekranına değil, neye onay verildiğini anlatan sayfaya
// (/integrations/connect/<kod>) açılır; müşteri oradan devam eder.
@ApiTags('Invite links')
@Controller('/invite-links')
export class InviteLinkController {
  constructor(private _integrationService: IntegrationService) {}

  // Kanal sınırı burada ve müşteri sayfadan devam ederken yeniden denetlenir.
  @Post('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  async createInviteLink(
    @GetOrgFromRequest() org: Organization,
    @Body() body: InviteLinkDto
  ) {
    return this._integrationService.createConnectLink(org.id, body.integration);
  }
}
