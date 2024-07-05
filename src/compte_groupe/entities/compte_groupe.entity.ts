import { ComptePrincipal } from "src/compte_principal/entities/compte_principal.entity";
import { Entity } from "typeorm";

@Entity()
export class CompteGroupe extends ComptePrincipal {}
