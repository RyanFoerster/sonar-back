import { Injectable } from "@nestjs/common";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Client } from "./entities/client.entity";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly userService: UsersService,
  ) {}

  async create(user: User, createClientDto: CreateClientDto) {
    let client: Client;
    client = await this.clientRepository.save(createClientDto);
    client.user = await this.userService.findOne(user.id);
    return await this.clientRepository.update(client.id, client);
  }

  async findAll() {
    return await this.clientRepository.find(/*{
      relations: {
        user: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        postalCode: true,
        user: {
          id: true,
          email: true,
          username: true,
        },
      },
    }*/);
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
}
