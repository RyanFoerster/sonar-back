import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompteGroupe } from '../../compte_groupe/entities/compte_groupe.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class UserSecondaryAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  secondary_account_id: number;

  @ManyToOne(
    () => CompteGroupe,
    (groupAccount) => groupAccount.userSecondaryAccount,
    { eager: true, cascade: true },
  )
  group_account: CompteGroupe;

  @ManyToOne(() => User, (user) => user.userSecondaryAccounts)
  user: User;

  @Column({ type: 'enum', enum: ['ADMIN', 'VIEWER', 'NONE'], default: 'NONE' })
  role_agenda: 'ADMIN' | 'VIEWER' | 'NONE';

  @Column({ type: 'enum', enum: ['ADMIN', 'VIEWER', 'NONE'], default: 'NONE' })
  role_billing: 'ADMIN' | 'VIEWER' | 'NONE';

  @Column({ type: 'enum', enum: ['ADMIN', 'VIEWER', 'NONE'], default: 'NONE' })
  role_treasury: 'ADMIN' | 'VIEWER' | 'NONE';

  @Column({ type: 'enum', enum: ['ADMIN', 'VIEWER', 'NONE'], default: 'NONE' })
  role_gestion: 'ADMIN' | 'VIEWER' | 'NONE';

  @Column({ type: 'enum', enum: ['ADMIN', 'VIEWER', 'NONE'], default: 'NONE' })
  role_contract: 'ADMIN' | 'VIEWER' | 'NONE';

  @Column({ type: 'enum', enum: ['ADMIN', 'VIEWER', 'NONE'], default: 'NONE' })
  role_document: 'ADMIN' | 'VIEWER' | 'NONE';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
