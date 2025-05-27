import {
  Body,
  Controller,
  Delete,
  Get, Logger,
  Param, ParseIntPipe,
  Patch,
  Post,
  Req,
  Request,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CompteGroupeService } from './compte_groupe.service';
import { CreateCompteGroupeDto } from './dto/create-compte_groupe.dto';
import { UpdateCompteGroupeDto } from './dto/update-compte_groupe.dto';

@Controller('compte-groupe')
export class CompteGroupeController {
  constructor(
    private readonly compteGroupeService: CompteGroupeService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(
    @Body() createCompteGroupeDto: CreateCompteGroupeDto,
    @Request() request,
  ) {
    return this.compteGroupeService.create(
      createCompteGroupeDto,
      request.user.id,
    );
  }

  @Get()
  async findAll(@Req() req) {
    return this.compteGroupeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.compteGroupeService.findOne(+id);
  }

  @Get('user/:id')
  findAllByUser(@Param('id') id: string) {
    return this.compteGroupeService.findAllByUser(+id);
  }

  @Get(':id/members')
  findAllMembers(@Param('id') id: string) {
    return this.compteGroupeService.findAllMembers(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCompteGroupeDto: UpdateCompteGroupeDto,
  ) {
    return this.compteGroupeService.update(+id, updateCompteGroupeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.compteGroupeService.remove(+id);
  }
  @Patch(':id/commission')
  async updateCommission(
    @Param('id') id: string,
    @Body('commission') commissionPourcentage: any,
  ) {
    return this.compteGroupeService.updateCommission(+id, commissionPourcentage);
  }

  @Patch(':id/solde')
  async updateGroupeSolde(
    @Param('id', ParseIntPipe) id: number,
    @Body('amount_htva') amount_htva: number,
  ) {

    return this.compteGroupeService.updateGroupeSolde(id, amount_htva);
  }


}
