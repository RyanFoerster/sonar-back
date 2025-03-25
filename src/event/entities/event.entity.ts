import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { CompteGroupe } from '../../compte_groupe/entities/compte_groupe.entity';

export enum EventStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

export interface InvitedPerson {
  personId: number | string; // peut être un ID utilisateur ou un email
  status: InvitationStatus;
  isExternal?: boolean; // si la personne est externe à la plateforme
  email?: string; // email pour les personnes externes
  name?: string; // nom pour les personnes externes
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'timestamp' })
  startDateTime: Date;

  @Column({ type: 'timestamp' })
  endDateTime: Date;

  @Column({ type: 'timestamp' })
  meetupDateTime: Date;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.PENDING,
  })
  status: EventStatus;

  @Column({ nullable: true })
  cancellationReason: string;

  @Column('jsonb', { default: [] })
  invitedPeople: InvitedPerson[];

  @Column()
  groupId: number;

  @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.events)
  @JoinColumn({ name: 'groupId' })
  group: CompteGroupe;

  @Column('jsonb')
  organizers: number[];

  @Column('jsonb', { default: [] })
  participants: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
