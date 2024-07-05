import { ComptePrincipal } from 'src/compte_principal/entities/compte_principal.entity';
import { UserSecondaryAccount } from 'src/user-secondary-account/entities/user-secondary-account.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string

  @Column()
  firstName: string

  @Column({ unique: true })
  numeroNational: string

  @Column({ unique: true })
  telephone: string

  @Column({ unique: true })
  iban: string

  @OneToOne(()=>ComptePrincipal)
  @JoinColumn()
  comptePrincipal: ComptePrincipal

  @OneToMany(()=> UserSecondaryAccount, (userSecondaryAccount) => userSecondaryAccount.user)
  userSecondaryAccounts: UserSecondaryAccount[];
}
