import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  communication: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  senderGroup?: number;

  @IsNumber()
  senderPrincipal?: number;

  @IsNumber()
  recipientGroup?: number[];

  @IsNumber()
  recipientPrincipal?: number[];

  @IsOptional()
  @IsNumber()
  invoice_id?: number;

}
