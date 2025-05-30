import {
  IsDate,
  IsEmail,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Type } from 'class-transformer';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsString()
  firstname?: string;

  @IsString()
  lastname?: string;

  @IsEmail()
  @IsString()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  street: string;

  @IsString()
  number: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsString()
  postalCode: string;

  @IsNumber()
  company_number?: string;

  @IsString()
  company_vat_number?: string;

  @IsString()
  national_number?: string;

  @IsBoolean()
  is_physical_person: boolean;

  @IsOptional()
  @IsBoolean()
  is_info_pending?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  default_payment_deadline?: number;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
