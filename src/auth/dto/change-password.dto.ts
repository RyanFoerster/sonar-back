import { IsString, IsStrongPassword } from "class-validator";

export class ChangePasswordDto {

  @IsString()
  @IsStrongPassword({
    minLength: 6,
    minNumbers: 1,
    minSymbols: 1
  })
  oldPassword: string;

  @IsString()
  @IsStrongPassword({
    minLength: 6,
    minNumbers: 1,
    minSymbols: 1
  })
  newPassword: string;
}