import { IsNumber, IsString } from "class-validator";

export class CreateVirementSepaDto {

  @IsString()
  account_owner: string

  @IsString()
  iban: string

  @IsNumber()
  amount_htva: number

  @IsNumber()
  amount_tva: number

  @IsNumber()
  amount_total: number

  @IsString()
  communication?: string

  @IsString()
  structured_communication?: string
}
