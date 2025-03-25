import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RespondInvitationDto {
  @IsBoolean()
  accept: boolean;

  @IsString()
  @IsOptional()
  message?: string;
}
