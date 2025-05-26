import {
  BeforeInsert,
  Column,
  Entity,
  getManager,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Invoice } from '../../invoice/entities/invoice.entity';
import { Quote } from '../../quote/entities/quote.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { VirementSepa } from '../../virement-sepa/entities/virement-sepa.entity';
import { ProjectAttachmentEntity } from '../../user-attachment/entities/user-attachment.entity';

@Entity()
export class ComptePrincipal {
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

  @Column({ default: 5, type: 'double precision' })
  commissionPourcentage: number;

  @Column({ default: 0, type: 'double precision' })
  commission: number;

  @Column({ default: false })
  CommissionRecipientAccount: boolean;

  @OneToMany(() => Quote, (quote) => quote.main_account, {
    nullable: true,
    eager: true,
    cascade: true,
  })
  quote: Quote[];

  @OneToMany(() => Invoice, (invoice) => invoice.main_account, {
    nullable: true,
    eager: true,
    cascade: true,
  })
  invoice: Invoice[];

  @OneToMany(() => Transaction, (transaction) => transaction.senderPrincipal, {
    cascade: true,
  })
  transactions: Transaction[];

  @OneToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @OneToMany(
    () => VirementSepa,
    (virementSepa) => virementSepa.comptePrincipal,
    { nullable: true, eager: true },
  )
  virementSepa?: VirementSepa[];

  @OneToMany(
    () => ProjectAttachmentEntity,
    (attachment) => attachment.comptePrincipal,
    {
      nullable: true,
      eager: true,
    },
  )
  attachments: ProjectAttachmentEntity[];
}
