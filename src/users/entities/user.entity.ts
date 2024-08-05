import { ComptePrincipal } from "src/compte_principal/entities/compte_principal.entity";
import { UserSecondaryAccount } from "src/user-secondary-account/entities/user-secondary-account.entity";
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Invoice } from "../../invoice/entities/invoice.entity";
import { Client } from "../../clients/entities/client.entity";

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

  @Column({default: "USER"})
  role: "USER" | "ADMIN" | "GUEST"

  @Column()
  address: string

  @Column({ default: false })
  isActive: boolean

  @Column({nullable: true})
  profilePicture: string

  @OneToOne(() => ComptePrincipal, {
    eager: true,
    cascade: ['insert', "update", "remove"],
    onDelete: "CASCADE"
  })
  @JoinColumn()
  comptePrincipal: ComptePrincipal

  @OneToMany(()=> UserSecondaryAccount, (userSecondaryAccount) => userSecondaryAccount.user, {
    eager: true,
    cascade: true
  })
  userSecondaryAccounts: UserSecondaryAccount[];

  @OneToMany((type) => Client, (client) => client.user, {
    eager: true,
    cascade: true,
  })
  clients: Client[];

}
