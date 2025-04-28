import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Invoice } from '../../invoice/entities/invoice.entity';
import { Quote } from '../../quote/entities/quote.entity';

@Entity()
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  firstname: string;

  @Column({ nullable: true })
  lastname: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  street: string;

  @Column()
  number: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column()
  postalCode: string;

  @Column({ nullable: true })
  company_number: string;

  @Column({ nullable: true })
  company_vat_number: string;

  @Column({ nullable: true })
  national_number: string;

  @Column({ default: false })
  is_physical_person: boolean;

  @Column({
    default: false,
    comment: 'Indicates if client information needs to be filled by the client',
  })
  is_info_pending: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Default payment deadline in days',
  })
  default_payment_deadline: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @ManyToOne((type) => User, (user) => user.clients)
  user: User;

  @OneToMany(() => Quote, (quote) => quote.client, { cascade: true })
  quote: Quote;

  @OneToMany(() => Invoice, (invoice) => invoice.client, { cascade: true })
  invoice: Invoice;
}
