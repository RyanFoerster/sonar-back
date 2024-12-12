import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVirementSepaDto {
  @IsString()
  account_owner: string;

  @IsString()
  iban: string;

  @IsNumber()
  amount_htva: number;

  @IsNumber()
  @IsOptional()
  amount_tva?: number;

  @IsNumber()
  amount_total: number;

  @IsString()
  communication: string;

  @IsString()
  @IsOptional()
  structured_communication?: string;
}
