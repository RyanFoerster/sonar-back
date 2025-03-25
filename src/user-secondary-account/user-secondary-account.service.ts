import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateUserSecondaryAccountDto } from './dto/create-user-secondary-account.dto';
import { UpdateUserSecondaryAccountDto } from './dto/update-user-secondary-account.dto';
import { UserSecondaryAccount } from './entities/user-secondary-account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { CompteGroupeService } from '../compte_groupe/compte_groupe.service';

@Injectable()
export class UserSecondaryAccountService {
  constructor(
    @InjectRepository(UserSecondaryAccount)
    private readonly userSecondaryAccountRepository: Repository<UserSecondaryAccount>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => CompteGroupeService))
    private readonly compteGroupService: CompteGroupeService,
  ) {}

  async create(
    createUserSecondaryAccountDto: CreateUserSecondaryAccountDto,
    params?: any,
  ) {
    if (params !== undefined) {
      let user: User | undefined = await this.usersService.findOneByEmail(
        params.email,
      );

      let compteGroupe = await this.compteGroupService.findOne(
        createUserSecondaryAccountDto.secondary_account_id,
      );

      if (
        user.userSecondaryAccounts.find(
          (account) => account.secondary_account_id === compteGroupe.id,
        )
      ) {
        throw new BadRequestException(
          "L'utilisateur fait déja parti de ce groupe",
        );
      }

      createUserSecondaryAccountDto.user = user;
      let userSecondaryAccount: CreateUserSecondaryAccountDto = {
        user,
        secondary_account_id: compteGroupe.id,
        group_account: compteGroupe,
        role_agenda: 'NONE',
        role_billing: 'NONE',
        role_contract: 'NONE',
        role_document: 'NONE',
        role_gestion: 'NONE',
        role_treasury: 'NONE',
      };

      return await this.userSecondaryAccountRepository.save(
        userSecondaryAccount,
      );
    }

    return this.userSecondaryAccountRepository.save(
      createUserSecondaryAccountDto,
    );
  }

  findAll() {
    return `This action returns all userSecondaryAccount`;
  }

  findOne(id: number) {
    return this.userSecondaryAccountRepository.findOneBy({ id });
  }

  findAllBySecondaryAccountId(id: number) {
    return this.userSecondaryAccountRepository
      .createQueryBuilder('user_secondary_account')
      .leftJoinAndSelect(
        'user_secondary_account.group_account',
        'group_account',
      )
      .leftJoinAndSelect('user_secondary_account.user', 'user')
      .select([
        'user_secondary_account.id',
        'user.id',
        'user.email',
        'user.firstName',
        'user.name',
        'user.iban',
        'user.telephone',
        'user.numeroNational',
      ])
      .where('group_account.id = :id', { id })
      .getMany();
  }

  async update(
    id: number,
    updateUserSecondaryAccountDto: UpdateUserSecondaryAccountDto,
  ) {
    await this.userSecondaryAccountRepository.save(
      updateUserSecondaryAccountDto,
    );
    return this.findOne(id);
  }

  async remove(id: number) {
    try {
      return await this.userSecondaryAccountRepository.delete({ id });
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  /**
   * Trouve tous les utilisateurs ayant des droits d'administration ou de visualisation
   * sur la trésorerie d'un groupe
   * @param groupAccountId L'ID du compte groupe
   * @returns Liste des comptes secondaires avec utilisateurs ayant des droits treasury
   */
  async findUsersWithTreasuryRights(groupAccountId: number) {
    const logger = new Logger('UserSecondaryAccountService');

    logger.log(
      `[TRACE] Recherche des utilisateurs avec droits treasury pour le groupe ID: ${groupAccountId}`,
    );

    try {
      // Construction de la requête
      const query = this.userSecondaryAccountRepository
        .createQueryBuilder('user_secondary_account')
        .leftJoinAndSelect(
          'user_secondary_account.group_account',
          'group_account',
        )
        .leftJoinAndSelect('user_secondary_account.user', 'user')
        .where('group_account.id = :groupAccountId', { groupAccountId })
        .andWhere('user_secondary_account.role_treasury IN (:...roles)', {
          roles: ['ADMIN', 'VIEWER'],
        })
        .select([
          'user_secondary_account.id',
          'user_secondary_account.role_treasury',
          'group_account.id',
          'group_account.username',
          'user.id',
          'user.email',
          'user.firstName',
          'user.name',
        ]);

      logger.log(`[TRACE] Exécution de la requête SQL: ${query.getSql()}`);

      const result = await query.getMany();

      logger.log(
        `[TRACE] Résultat: ${result.length} utilisateurs trouvés avec droits treasury`,
      );

      // Afficher le détail des utilisateurs trouvés
      if (result.length > 0) {
        for (const userAcct of result) {
          logger.log(
            `[TRACE] - Utilisateur ID: ${userAcct.user?.id}, Nom: ${userAcct.user?.firstName} ${userAcct.user?.name}, Rôle: ${userAcct.role_treasury}`,
          );
        }
      } else {
        logger.warn(
          `[TRACE] Aucun utilisateur avec rôle treasury trouvé pour le groupe ${groupAccountId}`,
        );
      }

      return result;
    } catch (error) {
      logger.error(
        `[TRACE] Erreur lors de la recherche des utilisateurs avec droits treasury: ${error.message}`,
      );
      logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur est déjà membre d'un groupe spécifique
   * @param userId ID de l'utilisateur à vérifier
   * @param groupId ID du groupe à vérifier
   * @returns true si l'utilisateur est déjà membre du groupe, false sinon
   */
  async isUserInGroup(userId: number, groupId: number): Promise<boolean> {
    const logger = new Logger('UserSecondaryAccountService');
    logger.log(
      `[TRACE] Vérification si l'utilisateur ${userId} est membre du groupe ${groupId}`,
    );

    try {
      const result = await this.userSecondaryAccountRepository
        .createQueryBuilder('user_secondary_account')
        .leftJoinAndSelect('user_secondary_account.user', 'user')
        .leftJoinAndSelect(
          'user_secondary_account.group_account',
          'group_account',
        )
        .where('user.id = :userId', { userId })
        .andWhere('group_account.id = :groupId', { groupId })
        .getOne();

      logger.log(
        `[TRACE] Résultat: ${result ? 'Utilisateur déjà membre' : 'Utilisateur non membre'}`,
      );
      return !!result;
    } catch (error) {
      logger.error(
        `[TRACE] Erreur lors de la vérification de l'appartenance au groupe: ${error.message}`,
      );
      logger.error(error.stack);
      return false;
    }
  }

  /**
   * Trouve tous les utilisateurs qui sont administrateurs d'un groupe
   * @param groupId ID du groupe
   * @returns Liste des comptes secondaires avec utilisateurs ayant le rôle ADMIN pour la gestion
   */
  async findAdminsForGroup(groupId: number) {
    const logger = new Logger('UserSecondaryAccountService');
    logger.log(
      `[TRACE] Recherche des administrateurs pour le groupe ID: ${groupId}`,
    );

    try {
      const result = await this.userSecondaryAccountRepository
        .createQueryBuilder('user_secondary_account')
        .leftJoinAndSelect(
          'user_secondary_account.group_account',
          'group_account',
        )
        .leftJoinAndSelect('user_secondary_account.user', 'user')
        .where('group_account.id = :groupId', { groupId })
        .andWhere('user_secondary_account.role_gestion = :role', {
          role: 'ADMIN',
        })
        .select([
          'user_secondary_account.id',
          'user_secondary_account.role_gestion',
          'group_account.id',
          'group_account.username',
          'user.id',
          'user.email',
          'user.firstName',
          'user.name',
        ])
        .getMany();

      logger.log(
        `[TRACE] Trouvé ${result.length} administrateurs pour le groupe ${groupId}`,
      );
      return result;
    } catch (error) {
      logger.error(
        `[TRACE] Erreur lors de la recherche des administrateurs du groupe: ${error.message}`,
      );
      logger.error(error.stack);
      return [];
    }
  }
}
