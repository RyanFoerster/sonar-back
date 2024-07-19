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
    const userConnected: User = await this.usersService.findOneByEmail(
      req.user.email,
    );

    if (userConnected.role === 'ADMIN') {
      return this.comptePrincipalService.findAll();
    } else {
      throw new UnauthorizedException("Vous n'êtes pas autorisé a faire cela");
    }
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
    return this.comptePrincipalService.update(+id, updateComptePrincipalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return;
  }
}
