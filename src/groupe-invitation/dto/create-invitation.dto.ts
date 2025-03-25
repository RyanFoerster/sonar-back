import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInvitationDto {
  @IsNumber()
  secondary_account_id: number;

  @IsNumber()
  invitedUserId: number;

  @IsString()
  @IsOptional()
  message?: string;
}
