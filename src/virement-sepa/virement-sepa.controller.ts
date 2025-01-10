import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { VirementSepaService } from './virement-sepa.service';
import { CreateVirementSepaDto } from './dto/create-virement-sepa.dto';
import { UpdateVirementSepaDto } from './dto/update-virement-sepa.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../services/s3/s3.service';
import { Public } from '@/auth/decorators/public.decorator';

@Controller('virement-sepa')
export class VirementSepaController {
  constructor(
    private readonly virementSepaService: VirementSepaService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('invoice'))
  async create(
    @Body() createVirementSepaDto: CreateVirementSepaDto,
    @Request() req,
    @Query() params: string,
    @UploadedFile() invoice: Express.Multer.File,
  ) {
    Logger.debug(JSON.stringify(createVirementSepaDto, null, 2));
    return this.virementSepaService.create(
      createVirementSepaDto,
      req.user.id,
      params,
      invoice,
    );
  }

  @Get()
  findAll(@Request() req) {
    return this.virementSepaService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.virementSepaService.findOne(+id);
  }

  @Get(':id/invoice')
  async getInvoice(@Param('id') id: string) {
    const virementSepa = await this.virementSepaService.findOne(+id);
    if (virementSepa.invoice_key) {
      return await this.s3Service.getFile(virementSepa.invoice_key);
    }
    return null;
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVirementSepaDto: UpdateVirementSepaDto,
  ) {
    return this.virementSepaService.update(+id);
  }

  @Patch(':id/reject')
  rejectVirement(
    @Param('id') id: string,
    @Body() body: { rejected_reason: string },
  ) {
    return this.virementSepaService.update(+id, 'REJECTED', body);
  }

  @Patch(':id/accept')
  acceptVirement(@Param('id') id: string) {
    return this.virementSepaService.update(+id, 'ACCEPTED');
  }

  @Patch(':id/paid')
  paidVirement(@Param('id') id: string, @Request() req) {
    return this.virementSepaService.paid(+id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.virementSepaService.remove(+id);
  }
}
