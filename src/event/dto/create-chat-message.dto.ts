import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateChatMessageDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsNumber()
  @IsNotEmpty()
  senderId: number;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderEmail?: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
