import { User } from "../../users/entities/user.entity";
import { PaiementMode } from "../enums/paiement_mode";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Status } from "../enums/status";
import { ComptePrincipal } from "../../compte_principal/entities/compte_principal.entity";
import { CompteGroupe } from "../../compte_groupe/entities/compte_groupe.entity";
import { Product } from "../../product/entities/product.entity";
import { Client } from "../../clients/entities/client.entity";
import { Quote } from "../../quote/entities/quote.entity";

@Entity()
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  invoice_date: Date;

  @Column()
  service_date: Date;

  @Column("double precision")
  price_htva: number;

  @Column("double precision")
  total_vat_6: number;

  @Column("double precision")
  total_vat_21: number;

  @Column("double precision")
  total: number;

  @Column()
  payment_deadline: Date;

  @Column({ type: "enum", enum: ["paid", "pending", "overdue"], default: "pending" })
  status: string;

  @ManyToOne(() => ComptePrincipal, (comptePrincipal) => comptePrincipal.invoice, { nullable: true })
  main_account: ComptePrincipal;

  @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.invoice, { nullable: true })
  group_account: CompteGroupe;

  @OneToMany(() => Product, (product) => product.invoice)
  products: Product[];

  @ManyToOne(() => Client, (client) => client.invoice)
  client: Client;

  @ManyToOne(() => Quote, (quote) => quote.invoice)
  quote: Quote;
}