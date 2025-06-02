import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
  IsObject,
} from 'class-validator';
import { EventStatus, InvitationStatus } from '../entities/event.entity';

export class InvitedPersonDto {
  @IsNotEmpty()
  personId: number | string;

  @IsEnum(InvitationStatus)
  status: InvitationStatus = InvitationStatus.PENDING;

  @IsOptional()
  isExternal?: boolean;

  @ValidateIf((o) => o.isExternal === true)
  @IsString()
  @IsNotEmpty()
  email?: string;

  @ValidateIf((o) => o.isExternal === true)
  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDateString()
  @IsNotEmpty()
  startDateTime: string;

  @IsDateString()
  @IsOptional()
  endDateTime?: string;

  @IsDateString()
  @IsOptional()
  meetupDateTime?: string;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus = EventStatus.PENDING;

  @ValidateIf((o) => o.status === EventStatus.CANCELLED)
  @IsString()
  @IsNotEmpty()
  cancellationReason?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InvitedPersonDto)
  invitedPeople?: InvitedPersonDto[];

  @IsNumber()
  @IsNotEmpty()
  groupId: number;

  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  organizers: number[];
}
