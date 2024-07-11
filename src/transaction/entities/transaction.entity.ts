import { CompteGroupe } from "src/compte_groupe/entities/compte_groupe.entity";
import { ComptePrincipal } from "src/compte_principal/entities/compte_principal.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    communication: string;

    @Column()
    amount: number;

    @ManyToOne(() => CompteGroupe, (compteGroupe) => compteGroupe.transactions, {nullable: true})
    @JoinColumn()
    senderGroup: CompteGroupe;

    @ManyToOne(() => ComptePrincipal, (comptePrincipal) => comptePrincipal.transactions, {nullable: true})
    @JoinColumn()
    senderPrincipal: ComptePrincipal;

    @ManyToMany(() => CompteGroupe, {cascade: true})
    @JoinTable()
    recipientGroup: CompteGroupe[];

    @ManyToMany(() => ComptePrincipal, {cascade: true})
    @JoinTable()
    recipientPrincipal: ComptePrincipal[];

    @CreateDateColumn()
    date: Date;

}
