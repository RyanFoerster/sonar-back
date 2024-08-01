import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Quote } from '../../quote/entities/quote.entity';
import { Invoice } from '../../invoice/entities/invoice.entity';
import { Transaction } from 'src/transaction/entities/transaction.entity';
import { UserSecondaryAccount } from '../../user-secondary-account/entities/user-secondary-account.entity';

@Entity()
export class CompteGroupe {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  username: string;

  @Column({ default: 0 })
  solde?: number;

  @OneToMany(() => Quote, (quote) => quote.group_account, {
    nullable: true,
    eager: true,
  })
  quote: Quote[];

  @OneToMany(() => Invoice, (invoice) => invoice.group_account, {
    nullable: true,
    eager: true,
  })
  invoice: Invoice[];

  @OneToMany(() => Transaction, (transaction) => transaction.senderPrincipal, {
    eager: true,
  })
  transactions: Transaction[];

  @OneToMany(
    () => UserSecondaryAccount,
    (userSecondaryAccount) => userSecondaryAccount.group_account,
  )
  userSecondaryAccount: UserSecondaryAccount[];
}
