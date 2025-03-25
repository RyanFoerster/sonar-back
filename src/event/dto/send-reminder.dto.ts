import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class SendReminderDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsArray()
  @IsNotEmpty()
  recipientIds: (number | string)[];
}
