import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateInvitationDto {
  @IsInt()
  @IsNotEmpty()
  eventId: number;

  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsOptional()
  status?: string; // invited, accepted, declined
}