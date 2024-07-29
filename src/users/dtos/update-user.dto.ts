import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class UpdateUserDto {

  @IsString()
  username: string;

  @IsString()
  name: string

  @IsString()
  firstName: string

  @IsString()
  numeroNational: string

  @IsString()
  telephone: string

  @IsEmail()
  email: string

  @IsString()
  iban: string

  @IsString()
  address?: string

}