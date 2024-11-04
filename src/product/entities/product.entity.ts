import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Invoice } from '../../invoice/entities/invoice.entity';
import { CompteGroupe } from '../../compte_groupe/entities/compte_groupe.entity';
import { Quote } from '../../quote/entities/quote.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  description: string;

  @Column({ type: 'double precision' })
  price: number;

  @Column({ type: 'double precision' })
  price_htva?: number;

  @Column({ type: 'double precision' })
  quantity: number;

  @Column({ type: 'double precision' })
  vat: number;

  @Column({ type: 'double precision' })
  tva_amount?: number;

  @Column({ nullable: true, type: 'double precision' })
  total?: number;

  @ManyToOne(() => Quote, (quote) => quote.products)
  quote: Quote;

  @ManyToOne(() => Invoice, (invoice) => invoice.products)
  invoice: Invoice;
}
