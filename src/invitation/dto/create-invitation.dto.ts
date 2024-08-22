import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateInvitationDto {
  @IsInt()
  @IsNotEmpty()
  eventId: number;

  @IsInt()
  @IsNotEmpty()
  userId: number;

}