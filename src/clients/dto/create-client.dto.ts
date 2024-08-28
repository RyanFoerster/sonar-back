import { IsDate, IsEmail, IsNumber, IsString } from "class-validator";
import { Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export class CreateClientDto {
  @IsString()
  name: string;

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
  company_number?: number;

  @IsString()
  company_vat_number?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
