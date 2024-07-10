import { PartialType } from "@nestjs/mapped-types";
import { CreateCompteGroupeDto } from "./create-compte_groupe.dto";

export class UpdateCompteGroupeDto extends PartialType(CreateCompteGroupeDto) {}
