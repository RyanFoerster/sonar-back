import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventId: string;

  @ManyToOne(() => Event, (event) => event.chatMessages)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  senderId: number;

  @Column({ nullable: true })
  senderName: string;

  @Column({ nullable: true })
  senderEmail: string;

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
