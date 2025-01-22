import { Injectable, Logger } from '@nestjs/common';
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

    // Vérifier les doublons uniquement si un numéro de TVA ou d'entreprise est fourni
    if (createClientDto.company_vat_number || createClientDto.company_number) {
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
      client = await this.clientRepository.save(createClientDto);
    }

    Logger.debug(JSON.stringify(client, null, 2));
    if (createClientDto.company_vat_number === '') {
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

  async checkBCE(vat: number) {
    console.log(vat);
    const response = await this.bceService.checkBCE(vat);
    console.log(response);
    return await this.bceService.checkBCE(vat);
  }
}
