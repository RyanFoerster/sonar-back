import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CompteGroupe } from '../../compte_groupe/entities/compte_groupe.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: 'GROUP_INVITATION' | 'ROLE_CHANGE' | 'OTHER';

  @Column()
  message: string;

  @Column()
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  fromUser: User;

  @ManyToOne(() => User)
  toUser: User;

  @ManyToOne(() => CompteGroupe, { nullable: true })
  group: CompteGroupe;
}
