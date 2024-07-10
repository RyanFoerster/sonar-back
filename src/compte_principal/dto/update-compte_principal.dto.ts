import { PartialType } from "@nestjs/mapped-types";
import { CreateComptePrincipalDto } from "./create-compte_principal.dto";

export class UpdateComptePrincipalDto extends PartialType(CreateComptePrincipalDto) {}
