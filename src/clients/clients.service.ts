import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { BceService } from '../services/bce/bce.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly userService: UsersService,
    private readonly bceService: BceService,
  ) {}

  async create(user: User, createClientDto: CreateClientDto) {
    let client: Client;
    let clientFromDB = null;

    // Si les infos sont en attente, seul l'email est requis (et le flag)
    if (createClientDto.is_info_pending) {
      if (!createClientDto.email) {
        throw new BadRequestException(
          'Email is required when client info is pending.',
        );
      }
      // Créer un client "partiel"
      client = this.clientRepository.create({
        email: createClientDto.email,
        is_info_pending: true,
        // Initialiser les champs requis comme "vide" ou valeur par défaut pour passer la validation DB
        name: 'A compléter par le client',
        phone: 'A compléter par le client',
        street: 'A compléter par le client',
        number: 'A compléter par le client',
        city: 'A compléter par le client',
        country: createClientDto.country || 'Belgique',
        postalCode: 'A compléter par le client',
        is_physical_person: createClientDto.is_physical_person || false,
        // Autres champs sont nullable ou ont des défauts
      });
    } else {
      // Logique existante pour la création/fusion de client standard
      // Vérifier les doublons uniquement si un numéro de TVA ou d'entreprise est fourni
      if (
        createClientDto.company_vat_number ||
        createClientDto.company_number
      ) {
        clientFromDB = await this.clientRepository.findOneBy({
          company_vat_number: createClientDto.company_vat_number,
        });

        if (!clientFromDB && createClientDto.company_number) {
          clientFromDB = await this.clientRepository.findOneBy({
            company_number: createClientDto.company_number,
          });
        }
      }

      if (clientFromDB) {
        clientFromDB = await this.clientRepository.merge(
          clientFromDB,
          createClientDto,
        );
        client = clientFromDB;
      } else {
        if (
          createClientDto.is_physical_person === undefined ||
          createClientDto.is_physical_person === null
        ) {
          createClientDto.is_physical_person = false;
        }
        // Assurer que is_info_pending est false si non spécifié
        createClientDto.is_info_pending = false;
        client = this.clientRepository.create(createClientDto);
      }
    }

    if (client.company_vat_number === '') {
      client.company_vat_number = null;
    }
    client.user = await this.userService.findOne(user.id);
    return await this.clientRepository.save(client);
  }

  async findAll() {
    return await this.clientRepository.find();
  }

  async findOne(id: number) {
    return await this.clientRepository.findOneBy({ id });
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    updateClientDto.updatedAt = new Date();
    return await this.clientRepository.update(id, updateClientDto);
  }

  async remove(id: number) {
    return await this.clientRepository.delete(id);
  }

  async updateClientDetailsFromQuote(
    clientId: number,
    updateData: UpdateClientDto,
  ): Promise<Client> {
    const client = await this.findOne(clientId);
    if (!client) {
      throw new BadRequestException(`Client with ID ${clientId} not found.`);
    }

    if (!client.is_info_pending) {
      // Optionnel: Empêcher la mise à jour si les infos ne sont plus en attente?
      // Ou simplement logger un avertissement.
      Logger.warn(
        `Attempting to update details for client ${clientId} where info is not pending.`,
      );
    }

    // Appliquer les mises à jour
    // Assurez-vous que UpdateClientDto contient les bons champs et validations
    // On ne met pas à jour l'email ici généralement.

    // Générer le nom si c'est une personne physique
    if (updateData.is_physical_person) {
      if (!updateData.firstname || !updateData.lastname) {
        throw new BadRequestException(
          'Firstname and lastname are required for physical persons.',
        );
      }
      client.name = `${updateData.firstname} ${updateData.lastname}`.trim();
    } else {
      if (!updateData.name) {
        throw new BadRequestException(
          'Company name is required for non-physical persons.',
        );
      }
      client.name = updateData.name;
    }

    client.firstname = updateData.firstname;
    client.lastname = updateData.lastname;
    client.phone = updateData.phone;
    client.street = updateData.street;
    client.number = updateData.number;
    client.city = updateData.city;
    client.postalCode = updateData.postalCode;
    client.country = updateData.country;
    client.company_number = updateData.company_number;
    client.company_vat_number = updateData.company_vat_number;
    client.national_number = updateData.national_number;
    client.is_physical_person = updateData.is_physical_person;
    client.default_payment_deadline = updateData.default_payment_deadline;

    // Marquer comme complété
    client.is_info_pending = false;
    client.updatedAt = new Date();

    return this.clientRepository.save(client);
  }

  async checkBCE(vat: number) {
    const response = await this.bceService.checkBCE(vat);
    return response;
  }
}
