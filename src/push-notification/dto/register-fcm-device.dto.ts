import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterFcmDeviceDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}
