import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity()
export class ScheduledReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @ManyToOne(() => Event, (event) => event.scheduledReminders)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column('jsonb')
  recipientIds: (number | string)[];

  @Column({ type: 'timestamp' })
  scheduledDate: Date;

  @Column({ nullable: true })
  customMessage: string;

  @Column({
    type: 'enum',
    enum: ReminderStatus,
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
