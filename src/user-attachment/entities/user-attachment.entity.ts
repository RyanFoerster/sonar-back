import { User } from '@/users/entities/user.entity';
import { ComptePrincipal } from '@/compte_principal/entities/compte_principal.entity';
import { CompteGroupe } from '@/compte_groupe/entities/compte_groupe.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

@Entity('project_attachments')
export class ProjectAttachmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  key: string;

  @Column()
  url: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'compte_principal_id', nullable: true })
  comptePrincipalId: number;

  @Column({ name: 'compte_groupe_id', nullable: true })
  compteGroupeId: number;

  @ManyToOne(() => ComptePrincipal, (compte) => compte.attachments, {
    nullable: true,
  })
  @JoinColumn({ name: 'compte_principal_id' })
  comptePrincipal: ComptePrincipal;

  @ManyToOne(() => CompteGroupe, (compte) => compte.attachments, {
    nullable: true,
  })
  @JoinColumn({ name: 'compte_groupe_id' })
  compteGroupe: CompteGroupe;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
