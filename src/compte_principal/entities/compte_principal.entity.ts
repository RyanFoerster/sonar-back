import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Invoice } from "../../invoice/entities/invoice.entity";
import { Quote } from "../../quote/entities/quote.entity";

@Entity()
export class ComptePrincipal {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  username: string;

  @Column({ default: 0 })
  solde?: number;

  @OneToMany(() => Quote, (quote) => quote.main_account, {nullable: true, eager: true})
  quote: Quote[];

  @OneToMany(() => Invoice, (invoice) => invoice.main_account, {nullable: true, eager: true})
  invoice: Invoice[];

}
