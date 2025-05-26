import {
  IsArray,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum ReminderTiming {
  NOW = 'now',
  ONE_HOUR = '1hour',
  ONE_DAY = '1day',
  CUSTOM = 'custom',
}

export class SendReminderDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsArray()
  @IsNotEmpty()
  recipientIds: (number | string)[];

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  customMessage?: string;

  @IsEnum(ReminderTiming)
  @IsOptional()
  timing?: ReminderTiming;
}
