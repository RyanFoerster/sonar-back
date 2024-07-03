import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ComptePrincipal {
    @PrimaryGeneratedColumn()
    id?: number;  

    @Column({ unique: true })
  username: string;

  @Column({default: 0})
  solde?: number;

}
