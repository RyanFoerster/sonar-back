import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsBoolean,
} from 'class-validator';

export class SendNotificationDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsBoolean()
  requireInteraction?: boolean;

  @IsOptional()
  @IsBoolean()
  renotify?: boolean;

  @IsOptional()
  @IsBoolean()
  silent?: boolean;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  actions?: { action: string; title: string }[];
}
