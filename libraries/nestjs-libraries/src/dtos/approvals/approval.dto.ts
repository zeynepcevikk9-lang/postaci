import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const approvalDecisions = ['APPROVED', 'CHANGES_REQUESTED'] as const;
export type ApprovalDecision = (typeof approvalDecisions)[number];

export class CreateApprovalDto {
  @IsIn(approvalDecisions)
  status: ApprovalDecision;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  reviewerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

// Toplu onay planı: ajans oluşturur.
export class CreateApprovalPlanDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsBoolean()
  autoSchedule?: boolean;
}

// Takvimdeki rozetler: görünen gönderilerin onay durumları.
export class ApprovalStatusesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  postIds: string[];
}

// Plan sayfasında tek bir gönderi (aynı içeriğin bütün kanalları) için karar.
export class PlanDecisionDto extends CreateApprovalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  group: string;
}

// Plan sayfasında "Tümünü onayla".
export class PlanApproveAllDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  reviewerName: string;
}
