import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { ComptePrincipal } from '../../compte_principal/entities/compte_principal.entity';
import { Meet } from '../../meet/entities/meet.entity';
import { UserSecondaryAccount } from '../../user-secondary-account/entities/user-secondary-account.entity';
import { Beneficiary } from '@/beneficiaries/entities/beneficiary.entity';
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ nullable: true })
  username: string;

  @Column({ select: false, nullable: true })
  password: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  numeroNational: string;

  @Column({ nullable: true })
  telephone: string;

  @Column({ nullable: true })
  iban: string;

  @Column({ default: 'USER' })
  role: 'USER' | 'ADMIN' | 'GUEST';

  @Column({ nullable: true })
  address: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  profilePicture: string;

  @OneToOne(() => ComptePrincipal, {
    eager: true,
    cascade: ['insert', 'update', 'remove'],
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  comptePrincipal: ComptePrincipal;

  @OneToMany(
    () => UserSecondaryAccount,
    (userSecondaryAccount) => userSecondaryAccount.user,
    {
      cascade: true,
    },
  )
  userSecondaryAccounts: UserSecondaryAccount[];

  @OneToMany((type) => Client, (client) => client.user, {
    eager: true,
    cascade: true,
  })
  clients: Client[];

  @ManyToMany((type) => Meet, (meet) => meet.user)
  meet: Meet;

  @OneToMany(() => Beneficiary, (beneficiary) => beneficiary.user)
  beneficiary: Beneficiary;

  @Column({ nullable: true, unique: true })
  googleId: string;

  // Store encrypted refresh token
  @Column({ nullable: true, select: false })
  googleRefreshToken: string;
}
