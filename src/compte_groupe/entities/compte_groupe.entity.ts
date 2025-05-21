import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Invoice } from '../../invoice/entities/invoice.entity';
import { Quote } from '../../quote/entities/quote.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { UserSecondaryAccount } from '../../user-secondary-account/entities/user-secondary-account.entity';
import { VirementSepa } from '../../virement-sepa/entities/virement-sepa.entity';
import { ProjectAttachmentEntity } from '@/user-attachment/entities/user-attachment.entity';
import { Event } from '../../event/entities/event.entity';

@Entity()
export class CompteGroupe {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  username: string;

  @Column({ default: 0, type: 'decimal', precision: 10, scale: 2 })
  solde?: number;

  @Column({ default: 1 })
  next_invoice_number: number;

  @Column({ default: 1 })
  next_quote_number: number;

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

  @OneToMany(() => Transaction, (transaction) => transaction.senderPrincipal)
  transactions: Transaction[];

  @OneToMany(
    () => UserSecondaryAccount,
    (userSecondaryAccount) => userSecondaryAccount.group_account,
  )
  userSecondaryAccount: UserSecondaryAccount[];

  @OneToMany(() => VirementSepa, (virementSepa) => virementSepa.compteGroupe, {
    nullable: true,
    eager: true,
  })
  virementSepa?: VirementSepa[];

  @OneToMany(
    () => ProjectAttachmentEntity,
    (attachment) => attachment.compteGroupe,
    {
      nullable: true,
      eager: true,
    },
  )
  attachments: ProjectAttachmentEntity[];

  @OneToMany(() => Event, (event) => event.group, {
    nullable: true,
  })
  events: Event[];
}
