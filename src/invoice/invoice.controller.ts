import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { InvoiceService } from "./invoice.service";
import { CreateCreditNoteDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { Invoice } from "./entities/invoice.entity";
import { Quote } from "../quote/entities/quote.entity";

@Controller("invoice")
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {
  }

  @Post()
  create(@Body() quote: Quote, @Req() req, @Query() params: string) {
    return this.invoiceService.create(quote, req.user, params);
  }

  @Get()
  findAll() {
    return this.invoiceService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.invoiceService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(+id, updateInvoiceDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.invoiceService.remove(+id);
  }

  // Route pour créer une note de crédit
  @Post("credit-note")
  createCreditNote(
    @Body() createCreditNoteDto: CreateCreditNoteDto
  ): Promise<Invoice> {
    return this.invoiceService.createCreditNote(createCreditNoteDto);
  }
}
