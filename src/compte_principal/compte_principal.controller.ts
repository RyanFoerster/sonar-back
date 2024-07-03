import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ComptePrincipalService } from './compte_principal.service';
import { CreateComptePrincipalDto } from './dto/create-compte_principal.dto';
import { UpdateComptePrincipalDto } from './dto/update-compte_principal.dto';

@Controller('compte-principal')
export class ComptePrincipalController {
  constructor(private readonly comptePrincipalService: ComptePrincipalService) {}

  @Post()
  create(@Body() createComptePrincipalDto: CreateComptePrincipalDto) {
    return ;
  }

  @Get()
  findAll() {
    return ;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comptePrincipalService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComptePrincipalDto: UpdateComptePrincipalDto) {
    return this.comptePrincipalService.update(+id, updateComptePrincipalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return ;
  }
}
