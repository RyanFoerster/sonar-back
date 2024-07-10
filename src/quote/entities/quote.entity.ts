import { Column, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { ComptePrincipal } from "../../compte_principal/entities/compte_principal.entity";
import { CompteGroupe } from "../../compte_groupe/entities/compte_groupe.entity";
import { Product } from "../../product/entities/product.entity";
import { Client } from "../../clients/entities/client.entity";
import { Invoice } from "../../invoice/entities/invoice.entity";

@Entity()
export class Quote {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  quote_date: Date;

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

  @Column({ default: 10 })
  payment_deadline: number;

  @Column({ type: "enum", enum: ["refused", "accepted", "invoiced", "cancelled", "pending", "pending_cancellation"], default: "pending" })
  status: string;

  @Column({default: false})
  group_acceptance: boolean;

  @Column({default: false})
  order_giver_acceptance: boolean;

  @ManyToOne(() => ComptePrincipal, (comptePrincipal) => comptePrincipal.quote, { nullable: true })
  main_account: ComptePrincipal;

  @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.quote, { nullable: true })
  group_account: CompteGroupe;

  @OneToMany(() => Product, (product) => product.quote)
  products: Product[];

  @ManyToOne(() => Client, (client) => client.quote)
  client: Client;

  @OneToMany(() => Invoice, (invoice) => invoice.quote)
  invoice: Invoice;


}
