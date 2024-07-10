import { ComptePrincipal } from "../../compte_principal/entities/compte_principal.entity";
import { CompteGroupe } from "../../compte_groupe/entities/compte_groupe.entity";
import { IsArray, IsBoolean, IsDate, IsEnum, IsNumber, IsObject } from "class-validator";

export class CreateQuoteDto {

  @IsDate()
  quote_date: Date;

  @IsDate()
  service_date: Date;

  @IsNumber()
  payment_deadline: number;

  @IsNumber()
  main_account_id?: number;

  @IsNumber()
  group_account_id?: number;

  @IsNumber()
  @IsArray()
  products_id: number[];

  @IsNumber()
  client_id: number;
}
