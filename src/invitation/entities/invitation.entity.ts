// src/invitations/entities/invitation.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Event } from 'src/event/entities/event.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Invitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  status: string;

  @ManyToOne(() => Event, (event) => event.invitation)
  event: Event;

  @ManyToOne(() => User, (user) => user.invitation)
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}