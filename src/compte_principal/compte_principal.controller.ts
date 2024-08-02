import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ComptePrincipalService } from './compte_principal.service';
import { CreateComptePrincipalDto } from './dto/create-compte_principal.dto';
import { UpdateComptePrincipalDto } from './dto/update-compte_principal.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';

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
