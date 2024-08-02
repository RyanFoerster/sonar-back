import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Invoice } from "../../invoice/entities/invoice.entity";
import { Quote } from "../../quote/entities/quote.entity";
import { Transaction } from "src/transaction/entities/transaction.entity";
import { User } from "../../users/entities/user.entity";

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

  @OneToMany(() => Transaction, (transaction) => transaction.senderPrincipal, )
  transactions: Transaction[]


}
