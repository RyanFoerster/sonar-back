import { Injectable, Logger } from '@nestjs/common';
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Client } from "./entities/client.entity";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";
import { BceService } from "../services/bce/bce.service";

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


    client = await this.clientRepository.save(createClientDto);
    Logger.debug(JSON.stringify(client, null, 2));
    if(createClientDto.company_vat_number === '') {
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
    const response = await this.bceService.checkBCE(vat);
    console.log(response);
    return await this.bceService.checkBCE(vat);
  }
}
