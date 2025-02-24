import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateQuoteDto {
  @IsDate()
  quote_date: Date;

  @IsDate()
  service_date: Date;

  @IsNumber()
  payment_deadline: number;

  @IsDate()
  validation_deadline: Date;

  @IsBoolean()
  isVatIncluded?: boolean;

  @IsNumber()
  main_account_id?: number;

  @IsNumber()
  group_account_id?: number;

  @IsNumber()
  @IsArray()
  products_id: number[];

  @IsNumber()
  client_id: number;

  @IsString()
  comment: string;

  @IsString()
  attachment_key?: string;

  @IsString()
  created_by?: string;

  @IsString()
  created_by_mail?: string;

  @IsString()
  created_by_phone?: string;

  @IsString()
  created_by_project_name?: string;
}
