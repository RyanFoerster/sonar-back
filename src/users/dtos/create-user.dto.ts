import { IsEmail, IsNumber, IsPhoneNumber, IsString, IsStrongPassword } from "class-validator";

export class CreateUserDto {
  @IsString()
  username: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  confirmPassword: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string

  @IsString()
  firstName: string

  @IsNumber()
  numeroNational: string

  @IsPhoneNumber()
  telephone: string

  @IsString()
  iban: string
}
