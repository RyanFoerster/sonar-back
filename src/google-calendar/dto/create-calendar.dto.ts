import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCalendarDto {
  @IsNotEmpty({
    message: 'Le nom du calendrier ne peut pas être vide.',
  })
  @IsString({
    message: 'Le nom du calendrier doit être une chaîne de caractères.',
  })
  @MaxLength(100, {
    message: 'Le nom du calendrier ne peut pas dépasser 100 caractères.',
  })
  summary: string;
}
