import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ComptePrincipalService } from './compte_principal.service';
import { CreateComptePrincipalDto } from './dto/create-compte_principal.dto';
import { UpdateComptePrincipalDto } from './dto/update-compte_principal.dto';

@Controller('compte-principal')
export class ComptePrincipalController {
  constructor(
    private readonly comptePrincipalService: ComptePrincipalService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() createComptePrincipalDto: CreateComptePrincipalDto) {
    return;
  }

  @Get()
  async findAll(@Req() req) {
    return this.comptePrincipalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comptePrincipalService.findOne(+id);
  }

  @Get(':id/relations')
  findOneWithRelations(@Param('id') id: string) {
    return this.comptePrincipalService.findOneWithRelations(+id);
  }

  @Get(':id/members')
  findAllMembers(@Param('id') id: string) {
    return this.comptePrincipalService.findAllMembers(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComptePrincipalDto: UpdateComptePrincipalDto,
  ) {
    return this.comptePrincipalService.update(updateComptePrincipalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return;
  }
}
