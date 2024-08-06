import { CompteGroupe } from 'src/compte_groupe/entities/compte_groupe.entity';
import { Invitation } from 'src/invitation/entities/invitation.entity';
import { User } from 'src/users/entities/user.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';

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

  @OneToMany(() => CompteGroupe, (compteGroupe) => compteGroupe.event)
  group: CompteGroupe[];

  @OneToMany(()=> User, (user)=> user.event)
  user: User[];

  @OneToMany(() => Invitation, (invitation) => invitation.event)
  invitation: Invitation;

  @OneToMany(() => Comment, (comment) => comment.event)
  comment: Comment;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}