import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateNotificationDto {
  @IsNumber()
  userId: number;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
