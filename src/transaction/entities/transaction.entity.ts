import { CompteGroupe } from '../../compte_groupe/entities/compte_groupe.entity';
import { ComptePrincipal } from '../../compte_principal/entities/compte_principal.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  communication: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ nullable: true })
  type?: 'SENDER' | 'RECIPIENT';

  @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.transactions, {
    nullable: true,
    eager: true,
  })
  @JoinColumn()
  senderGroup: CompteGroupe;

  @ManyToOne(
    () => ComptePrincipal,
    (comptePrincipal) => comptePrincipal.transactions,
    { nullable: true, eager: true },
  )
  @JoinColumn()
  senderPrincipal: ComptePrincipal;

  @ManyToMany(() => CompteGroupe, { cascade: true, eager: true })
  @JoinTable()
  recipientGroup: CompteGroupe[];

  @ManyToMany(() => ComptePrincipal, { cascade: true, eager: true })
  @JoinTable()
  recipientPrincipal: ComptePrincipal[];

  @CreateDateColumn()
  date: Date;
}
