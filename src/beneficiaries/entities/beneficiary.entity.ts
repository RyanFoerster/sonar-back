import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/users/entities/user.entity';

@Entity()
export class Beneficiary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  account_owner: string;

  @Column()
  iban: string;

  @ManyToOne(() => User, (user) => user.beneficiary)
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
