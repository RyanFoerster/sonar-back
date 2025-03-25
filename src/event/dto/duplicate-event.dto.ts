import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class DuplicateEventDto {
  @IsUUID()
  eventId: string;

  @IsDateString()
  @IsOptional()
  startDateTime?: string;

  @IsDateString()
  @IsOptional()
  endDateTime?: string;

  @IsDateString()
  @IsOptional()
  meetupDateTime?: string;
}
