import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompteGroupe } from '../../compte_groupe/entities/compte_groupe.entity';
import { ComptePrincipal } from '../../compte_principal/entities/compte_principal.entity';

@Entity()
export class VirementSepa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  account_owner: string;

  @Column()
  iban: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount_htva: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount_tva?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount_total: number;

  @Column()
  communication: string;

  @Column()
  structured_communication?: string;

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'REJECTED' | 'ACCEPTED' | 'PAID';

  @Column({ nullable: true })
  rejected_reason?: string;

  @Column()
  projet_username: string;

  @Column({ nullable: true })
  invoice_url?: string;

  @Column({ nullable: true })
  invoice_key?: string;

  @Column({ type: 'enum', enum: ['INCOMING', 'OUTGOING'] })
  transaction_type: 'INCOMING' | 'OUTGOING';

  @ManyToOne(
    () => ComptePrincipal,
    (comptePrincipal) => comptePrincipal.virementSepa,
    { nullable: true },
  )
  comptePrincipal?: ComptePrincipal;

  @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.virementSepa, {
    nullable: true,
  })
  compteGroupe?: CompteGroupe;

  @CreateDateColumn()
  created_at: Date;
}
