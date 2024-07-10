import { IsNumber, IsPositive, IsString } from "class-validator";

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
  quantity: number

  @IsPositive()
  @IsNumber()
  total?: number;
}
