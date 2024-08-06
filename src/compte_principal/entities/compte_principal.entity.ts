import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Invoice } from "../../invoice/entities/invoice.entity";
import { Quote } from "../../quote/entities/quote.entity";
import { Transaction } from "src/transaction/entities/transaction.entity";
import { User } from "../../users/entities/user.entity";
import { VirementSepa } from "../../virement-sepa/entities/virement-sepa.entity";

@Entity()
export class ComptePrincipal {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  username: string;

  @Column({ default: 0 })
  solde?: number;

  @OneToMany(() => Quote, (quote) => quote.main_account, {nullable: true, eager: true, cascade: true})
  quote: Quote[];

  @OneToMany(() => Invoice, (invoice) => invoice.main_account, {nullable: true, eager: true, cascade: true})
  invoice: Invoice[];

  @OneToMany(() => Transaction, (transaction) => transaction.senderPrincipal, {cascade: true})
  transactions: Transaction[]

  @OneToOne(() => User, {
    onDelete: "CASCADE"
  })
  @JoinColumn()
  user: User

  @OneToMany(() => VirementSepa, (virementSepa) => virementSepa.comptePrincipal, {nullable: true, eager: true})
  virementSepa?: VirementSepa[]
}
