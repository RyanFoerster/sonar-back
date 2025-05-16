import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateCreditNoteDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { Quote } from '../quote/entities/quote.entity';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  create(
    @Body() quote: Quote,
    @Req() req,
    @Query() params: { account_id: number; type: 'PRINCIPAL' | 'GROUP' },
  ) {
    return this.invoiceService.create(quote, req.user, params);
  }
  @Post('/createInvoiceWithoutQuote')
  createInvoiceWithoutQuote(
    @Body() quote: Quote,
    @Req() req,
    @Query() params: { account_id: number; type: 'PRINCIPAL' | 'GROUP' },
  ) {
    return this.invoiceService.createInvoiceWithoutQuote(quote, req.user, params);
  }


  @Get('all')
  findAll(@Req() req) {
    return this.invoiceService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(+id, updateInvoiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(+id);
  }

  // Route pour créer une note de crédit
  @Post('credit-note')
  createCreditNote(
    @Body() createCreditNoteDto: CreateCreditNoteDto,
    @Query() params: { account_id: number; type: 'PRINCIPAL' | 'GROUP' },
  ): Promise<Invoice> {
    return this.invoiceService.createCreditNote(createCreditNoteDto, params);
  }

  @Post('credit-note-without-invoice')
  createCreditNoteWithoutInvoice(
    @Body() createCreditNoteDto: any,
    @Query() params: { account_id: number; type: 'PRINCIPAL' | 'GROUP' },
  ): Promise<boolean> {
    return this.invoiceService.createCreditNoteWithoutInvoice(
      createCreditNoteDto,
      params.account_id,
      params.type,
    );
  }

  @Get('credit-note/:id')
  findCreditNoteByInvoiceId(@Param('id') id: string) {
    return this.invoiceService.findCreditNoteByInvoiceId(+id);
  }
}
