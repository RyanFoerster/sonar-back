import { IsNotEmpty } from 'class-validator';

import { IsString } from 'class-validator';

export class CreateBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  account_owner: string;

  @IsString()
  @IsNotEmpty()
  iban: string;
}
