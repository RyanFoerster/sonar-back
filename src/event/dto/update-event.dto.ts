import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InvitedPersonDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InvitedPersonDto)
  participants?: number[];
}
