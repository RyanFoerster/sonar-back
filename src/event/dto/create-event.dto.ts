 import { IsString, IsNotEmpty, IsDate, IsOptional, IsObject } from 'class-validator';
import { CompteGroupe } from 'src/compte_groupe/entities/compte_groupe.entity';
import { isStringObject } from 'util/types';

 export class CreateEventDto {
   @IsString()
   @IsNotEmpty()
   title: string;
 
   @IsString()
   @IsOptional()
   description?: string;
 
   @IsString()
   @IsOptional()
   location?: string;
 
   @IsDate()
   @IsNotEmpty()
   start_time: Date;
 
   @IsDate()
   @IsOptional()
   end_time?: Date;
 }