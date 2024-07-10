import { User } from "src/users/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { CompteGroupe } from "../../compte_groupe/entities/compte_groupe.entity";

@Entity()
export class UserSecondaryAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  secondary_account_id: number;

  @OneToOne(() => CompteGroupe, { eager: true })
  @JoinColumn()
  group_account: CompteGroupe;

  @ManyToOne(() => User, (user) => user.userSecondaryAccounts)
  user: User;

  @Column({ type: "enum", enum: ["ADMIN", "VIEWER", "NONE"], default: "NONE" })
  role_agenda: "ADMIN" | "VIEWER" | "NONE";

  @Column({ type: "enum", enum: ["ADMIN", "VIEWER", "NONE"], default: "NONE" })
  role_billing: "ADMIN" | "VIEWER" | "NONE";

  @Column({ type: "enum", enum: ["ADMIN", "VIEWER", "NONE"], default: "NONE" })
  role_treasury: "ADMIN" | "VIEWER" | "NONE";

  @Column({ type: "enum", enum: ["ADMIN", "VIEWER", "NONE"], default: "NONE" })
  role_gestion: "ADMIN" | "VIEWER" | "NONE";

  @Column({ type: "enum", enum: ["ADMIN", "VIEWER", "NONE"], default: "NONE" })
  role_contract: "ADMIN" | "VIEWER" | "NONE";

  @Column({ type: "enum", enum: ["ADMIN", "VIEWER", "NONE"], default: "NONE" })
  role_document: "ADMIN" | "VIEWER" | "NONE";

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updated_at: Date;
}