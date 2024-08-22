import { CompteGroupe } from 'src/compte_groupe/entities/compte_groupe.entity';
import { Invitation } from 'src/invitation/entities/invitation.entity';
import { User } from 'src/users/entities/user.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column()
  start_time: Date;

  @Column({ nullable: true })
  end_time: Date;

  @Column()
  rendez_vous_date: Date;

  @Column({ nullable: true, default: 'pending' })
  status: 'pending' | 'confirmed' | 'canceled' | 'hidden';

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true, type: 'json', default: [] })
  user_status: { user_id: number, status: 'accepted' | 'refused' }[];

  @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.event)
  group: CompteGroupe;

  @ManyToMany(() => User)
  @JoinTable()
  organisateurs: User[];

  @ManyToMany(() => User, { nullable: true })
  @JoinTable()
  participants: User[];

  @OneToMany(() => Invitation, (invitation) => invitation.event, { nullable: true })
  invitation: Invitation[];

  @OneToMany(() => Comment, (comment) => comment.event, { nullable: true })
  comments: Comment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}