import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ComptePrincipal } from '../../compte_principal/entities/compte_principal.entity';
import { CompteGroupe } from '../../compte_groupe/entities/compte_groupe.entity';
import { Product } from '../../product/entities/product.entity';
import { Client } from '../../clients/entities/client.entity';
import { Quote } from '../../quote/entities/quote.entity';

@Entity()
@Unique(['invoice_number', 'main_account'])
@Unique(['invoice_number', 'group_account'])
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  invoice_date: Date;

  @Column()
  invoice_number: number;

  @Column({ nullable: true })
  service_date: Date;

  @Column('double precision')
  price_htva: number;

  @Column('double precision')
  total_vat_6: number;

  @Column('double precision')
  total_vat_21: number;

  @Column('double precision')
  total: number;

  @Column({ nullable: true })
  payment_deadline: Date;

  @Column({ nullable: true })
  validation_deadline: Date;

  @Column()
  status: string;

  @ManyToOne(
    () => ComptePrincipal,
    (comptePrincipal) => comptePrincipal.invoice,
    { nullable: true },
  )
  main_account: ComptePrincipal;

  @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.invoice, {
    nullable: true,
  })
  group_account: CompteGroupe;

  @OneToMany(() => Product, (product) => product.invoice, { eager: true })
  products: Product[];

  @ManyToOne(() => Client, (client) => client.invoice, { eager: true })
  client: Client;

  @OneToOne(() => Quote)
  @JoinColumn()
  quote: Quote;

  @Column({
    type: 'enum',
    enum: ['invoice', 'credit_note'],
    default: 'invoice',
  })
  type: string; // Type de document (facture ou note de crédit)

  @Column({ nullable: true })
  linkedInvoiceId: number; // ID de la facture liée (pour les notes de crédit)

  @Column({ type: 'double precision', nullable: true })
  creditNoteAmount: number; // Montant de la note de crédit
}
