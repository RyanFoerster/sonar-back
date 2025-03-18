import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class PushSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'json' })
  subscription: {
    endpoint: string;
    expirationTime: string | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
