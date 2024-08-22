import { IsArray, IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDate()
  @IsNotEmpty()
  start_time: Date;

  @IsDate()
  @IsOptional()
  end_time?: Date;

  @IsDate()
  rendez_vous_date: Date;

  @IsArray()
  organisateurs_ids?: number[];

  @IsArray()
  participants_ids?: number[];

  @IsArray()
  invitations_ids?: number[];
}