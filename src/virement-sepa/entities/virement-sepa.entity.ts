import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ComptePrincipal } from "../../compte_principal/entities/compte_principal.entity";
import { CompteGroupe } from "../../compte_groupe/entities/compte_groupe.entity";

@Entity()
export class VirementSepa {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  account_owner: string;

  @Column()
  iban: string;

  @Column()
  amount_htva: number;

  @Column()
  amount_tva: number;

  @Column()
  amount_total: number;

  @Column()
  communication?: string;

  @Column()
  structured_communication?: string;

  @Column({ default: "PENDING" })
  status: "PENDING" | "REJECTED" | "ACCEPTED";

  @Column()
  projet_username: string;

  @ManyToOne(() => ComptePrincipal, (comptePrincipal) => comptePrincipal.virementSepa, { nullable: true })
  comptePrincipal?: ComptePrincipal;

  @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.virementSepa, { nullable: true })
  compteGroupe?: CompteGroupe;

  @CreateDateColumn()
  created_at: Date;
}
