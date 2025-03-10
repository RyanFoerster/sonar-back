import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  description: string;

  @IsPositive()
  @IsNumber()
  price: number;

  @IsPositive()
  @IsNumber()
  vat: number;

  @IsPositive()
  @IsNumber()
  quantity: number;

  @IsNumber()
  price_htva?: number;

  @IsNumber()
  tva_amount?: number;

  @IsPositive()
  @IsNumber()
  total?: number;
}
