import { IsDate, IsNumber } from "class-validator";

export class CreateInvoiceDto {
  @IsDate()
  invoice_date: Date;

  @IsDate()
  service_date: Date;

  @IsDate()
  payment_deadline: Date;

  @IsNumber()
  price_htva: number;

  @IsNumber()
  total_vat_6: number;

  @IsNumber()
  total_vat_21: number;

  @IsNumber()
  total: number;
}
