import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseInterceptors,
  UploadedFiles,
  Logger,
  Res,
  NotFoundException,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public } from '@/auth/decorators/public.decorator';
import { Response } from 'express';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('attachments'))
  create(
    @Body() body: { data: string },
    @Req() req,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('isDoubleValidation', ParseBoolPipe) isDoubleValidation: boolean,
  ) {
    const createQuoteDto = JSON.parse(body.data) as CreateQuoteDto;
    return this.quoteService.create(
      createQuoteDto,
      req.user.id,
      files || [],
      isDoubleValidation,
    );
  }

  @Get()
  findAll() {
    return this.quoteService.findQuoteWithoutInvoice();
  }

  @Get('all-admin')
  findAllForAdmin() {
    return this.quoteService.findAllForAdmin();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(+id);
  }

  @Post(':id/update')
  @UseInterceptors(FilesInterceptor('attachments'))
  update(
    @Param('id') id: string,
    @Body() body: { data: string },
    @Req() req,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('isDoubleValidation', ParseBoolPipe) isDoubleValidation: boolean,
  ) {
    const updateQuoteDto = JSON.parse(body.data) as UpdateQuoteDto;
    return this.quoteService.update(
      id,
      updateQuoteDto,
      req.user.id,
      files || [],
      isDoubleValidation,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quoteService.remove(+id);
  }

  @Patch(':id/group_acceptance')
  @Public()
  updateQuoteGroupAcceptance(@Param('id') id: string) {
    return this.quoteService.updateQuoteGroupAcceptance(+id);
  }

  @Patch(':id/order_giver_acceptance')
  @Public()
  updateOrderGiverAcceptance(@Param('id') id: string) {
    return this.quoteService.updateOrderGiverAcceptance(+id);
  }

  @Patch(':id/group_rejection')
  @Public()
  updateQuoteGroupRejection(@Param('id') id: string) {
    return this.quoteService.updateQuoteGroupRejection(+id);
  }

  @Patch(':id/order_giver_rejection')
  @Public()
  updateOrderGiverRejection(@Param('id') id: string) {
    return this.quoteService.updateOrderGiverRejection(+id);
  }

  @Patch(':id/group_rejection_cancel')
  @Public()
  updateQuoteGroupRejectionCancel(@Param('id') id: string) {
    return this.quoteService.updateQuoteGroupRejectionCancel(+id);
  }

  @Patch(':id/order_giver_rejection_cancel')
  @Public()
  updateOrderGiverRejectionCancel(@Param('id') id: string) {
    return this.quoteService.updateOrderGiverRejectionCancel(+id);
  }

  @Patch(':id/report_date')
  updateReportDate(
    @Param('id') id: string,
    @Body() updateReportDateDto: { report_date: Date },
  ): Promise<boolean> {
    return this.quoteService.updateReportDate(
      +id,
      updateReportDateDto.report_date,
    );
  }

  @Get('attachment/:key')
  @Public()
  async downloadAttachment(@Param('key') key: string, @Res() res: Response) {
    try {
      const fileBuffer = await this.quoteService.getAttachment(key);

      // Extraire le nom du fichier de la clé
      const fileName = key.split('/').pop() || 'attachment';

      // Déterminer le type MIME en fonction de l'extension
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      const mimeType = this.getMimeType(extension);

      // Configurer les en-têtes de la réponse
      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );
      res.setHeader('Content-Length', fileBuffer.length);

      // Envoyer le fichier
      res.send(fileBuffer);
    } catch (error) {
      Logger.error('Error downloading file:', error);
      throw new NotFoundException('Fichier non trouvé');
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }
}
