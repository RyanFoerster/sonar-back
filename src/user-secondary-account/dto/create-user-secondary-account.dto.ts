import { IsEnum, IsNumber, IsObject } from 'class-validator';
import { User } from 'src/users/entities/user.entity';
import { CompteGroupe } from '../../compte_groupe/entities/compte_groupe.entity';

export class CreateUserSecondaryAccountDto {
  user?: User;

  @IsNumber()
  secondary_account_id: number;

  @IsObject()
  group_account?: CompteGroupe;

  @IsEnum({ ADMIN: 'ADMIN', VIEWER: 'VIEWER', NONE: 'NONE' })
  role_agenda?: 'ADMIN' | 'VIEWER' | 'NONE';

  @IsEnum({ ADMIN: 'ADMIN', VIEWER: 'VIEWER', NONE: 'NONE' })
  role_billing?: 'ADMIN' | 'VIEWER' | 'NONE';

  @IsEnum({ ADMIN: 'ADMIN', VIEWER: 'VIEWER', NONE: 'NONE' })
  role_treasury?: 'ADMIN' | 'VIEWER' | 'NONE';

  @IsEnum({ ADMIN: 'ADMIN', VIEWER: 'VIEWER', NONE: 'NONE' })
  role_gestion?: 'ADMIN' | 'VIEWER' | 'NONE';

  @IsEnum({ ADMIN: 'ADMIN', VIEWER: 'VIEWER', NONE: 'NONE' })
  role_contract?: 'ADMIN' | 'VIEWER' | 'NONE';

  @IsEnum({ ADMIN: 'ADMIN', VIEWER: 'VIEWER', NONE: 'NONE' })
  role_document?: 'ADMIN' | 'VIEWER' | 'NONE';
}
