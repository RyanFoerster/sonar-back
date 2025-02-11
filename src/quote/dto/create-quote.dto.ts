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
}
