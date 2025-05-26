import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { User } from '../users/entities/user.entity';
import { ParseIntPipe } from '@nestjs/common';
import { Public } from '@/auth/decorators/public.decorator';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto, @Request() request) {
    let user: User = request.user as User;
    Logger.log('createClientDto', createClientDto);
    return this.clientsService.create(user, createClientDto);
  }

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(+id, updateClientDto);
  }

  @Patch('update-details/:id')
  @Public()
  updateDetails(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.updateClientDetailsFromQuote(
      id,
      updateClientDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(+id);
  }

  @Get('bce/:vat')
  checkBCE(@Param('vat') vat: number) {
    return this.clientsService.checkBCE(vat);
  }
}
