import { Controller, Get, Post, Body, Patch, Param, Delete, Request, Query } from "@nestjs/common";
import { VirementSepaService } from './virement-sepa.service';
import { CreateVirementSepaDto } from './dto/create-virement-sepa.dto';
import { UpdateVirementSepaDto } from './dto/update-virement-sepa.dto';

@Controller('virement-sepa')
export class VirementSepaController {
  constructor(private readonly virementSepaService: VirementSepaService) {}

  @Post()
  create(@Body() createVirementSepaDto: CreateVirementSepaDto, @Request() req, @Query() params: string) {
    return this.virementSepaService.create(createVirementSepaDto, req.user.id, params);
  }

  @Get()
  findAll(@Request() req) {

    return this.virementSepaService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.virementSepaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVirementSepaDto: UpdateVirementSepaDto) {
    return this.virementSepaService.update(+id);
  }

  @Patch(':id/reject')
  rejectVirement(@Param('id') id: string) {
    return this.virementSepaService.update(+id, "REJECTED");
  }

  @Patch(':id/accept')
  acceptVirement(@Param('id') id: string) {
    return this.virementSepaService.update(+id, "ACCEPTED");
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.virementSepaService.remove(+id);
  }
}
