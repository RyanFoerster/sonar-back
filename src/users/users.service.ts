import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './entities/user.entity';
import { ComptePrincipalService } from '../compte_principal/compte_principal.service';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly comptePrincipalService: ComptePrincipalService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    return await this.usersRepository.save(createUserDto);
  }

  async createWithoutSaving(user: User) {
    return this.usersRepository.create(user);
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.usersRepository.save(updateUserDto);
  }

  async findOne(id: number) {
    this.logger.log(`[findOne] Recherche de l'utilisateur ID: ${id}`);
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .addSelect('user.googleRefreshToken')
      .where('user.id = :id', { id })
      .leftJoinAndSelect('user.comptePrincipal', 'comptePrincipal')
      .leftJoinAndSelect('user.userSecondaryAccounts', 'userSecondaryAccounts')
      .leftJoinAndSelect('userSecondaryAccounts.group_account', 'group_account')
      .leftJoinAndSelect('user.clients', 'clients')
      .getOne();

    if (!user) {
      this.logger.warn(`[findOne] Utilisateur ID: ${id} non trouvé.`);
      return null;
    }

    const secondaryAccountIds =
      user.userSecondaryAccounts?.map((acc) => acc.id) || [];
    const secondaryAccountGroupIds =
      user.userSecondaryAccounts?.map((acc) => acc.secondary_account_id) || [];
    this.logger.log(
      `[findOne] Utilisateur ID: ${id} trouvé. IDs UserSecondaryAccount: [${secondaryAccountIds.join(', ')}] (Group IDs: [${secondaryAccountGroupIds.join(', ')}])`,
    );

    return user;
  }

  async findAll() {
    return await this.usersRepository.createQueryBuilder('user').getMany();
  }

  async findAllWithoutRelations() {
    return await this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.firstName',
        'user.name',
      ])
      .getMany();
  }

  async findOneByEmail(email: string) {
    return await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .addSelect('user.googleRefreshToken')
      .leftJoinAndSelect('user.userSecondaryAccounts', 'userSecondaryAccounts')
      .leftJoinAndSelect('userSecondaryAccounts.group_account', 'group_account')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findOneByUsername(username: string): Promise<User> {
    return await this.usersRepository.findOneBy({ username });
  }

  async findAllUsersGroup(params: any) {
    return await this.usersRepository.find({
      where: {
        userSecondaryAccounts: {
          secondary_account_id: params.id,
        },
      },
    });
  }

  async findUserByPrincipalAccountId(id: number) {
    return await this.usersRepository.findOne({
      where: {
        comptePrincipal: {
          id,
        },
      },
    });
  }

  async findUserBySecondaryAccountId(id: number) {
    return await this.usersRepository.findOne({
      where: {
        userSecondaryAccounts: {
          secondary_account_id: id,
        },
      },
    });
  }

  async updateAddress(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    const {
      username,
      name,
      firstName,
      numeroNational,
      telephone,
      email,
      iban,
      address,
    } = updateUserDto;

    if (!user) {
      throw new BadRequestException();
    }

    user.address = address;
    user.username = username;
    user.name = name;
    user.email = email;
    user.firstName = firstName;
    user.numeroNational = numeroNational;
    user.telephone = telephone;
    user.iban = iban;

    const principalAccount = user.comptePrincipal;

    principalAccount.username = username;
    await this.comptePrincipalService.update(principalAccount);

    return await this.usersRepository.save(user);
  }

  async findAllPendingUser() {
    return this.usersRepository.find({
      where: {
        isActive: false,
      },
    });
  }

  async toggleActiveUser(user: User) {
    user.isActive = true;
    return await this.usersRepository.save(user);
  }

  async delete(id: number): Promise<void> {
    this.logger.log(
      `[delete] Tentative de suppression de l'utilisateur ID: ${id}`,
    );

    try {
      // Vérifier si l'utilisateur existe
      const userExists = await this.usersRepository
        .createQueryBuilder('user')
        .where('user.id = :id', { id })
        .getOne();

      if (!userExists) {
        this.logger.warn(
          `[delete] Utilisateur ID: ${id} non trouvé pour suppression.`,
        );
        throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé.`);
      }

      // Supprimer les relations userSecondaryAccounts séparément
      // await this.usersRepository.manager
      //   .createQueryBuilder()
      //   .delete()
      //   .from('user_secondary_account')
      //   .where('userId = :id', { id })
      //   .execute();

      await this.usersRepository.manager
        .createQueryBuilder()
        .delete()
        .from('compte_principal')
        .where('userId = :id', { id })
        .execute();

      // Supprimer l'utilisateur directement
      await this.usersRepository
        .createQueryBuilder()
        .delete()
        .from(User)
        .where('id = :id', { id })
        .execute();

      this.logger.log(`[delete] Utilisateur ID: ${id} supprimé avec succès`);
    } catch (error) {
      this.logger.error(
        `[delete] Erreur lors de la suppression de l'utilisateur ID: ${id}:`,
        error.stack,
      );
      throw error;
    }
  }

  async updateProfilePicture(user: User, file: Express.Multer.File) {
    /*const url = await this.googleDriveService.uploadImage(file);
    Logger.debug(url);
    user.profilePicture = url;
    return await this.usersRepository.save(user);*/
  }
}
