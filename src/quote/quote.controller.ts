import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quoteService.create(createQuoteDto);
  }

  @Get()
  findAll() {
    return this.quoteService.findQuoteWithoutInvoice();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto) {
    return this.quoteService.update(+id, updateQuoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quoteService.remove(+id);
  }

  @Patch(':id/group_acceptance')
  updateQuoteGroupAcceptance(@Param('id') id: string) {
    return this.quoteService.updateQuoteGroupAcceptance(+id)
  }

  @Patch(':id/order_giver_acceptance')
  updateOrderGiverAcceptance(@Param('id') id: string) {
    return this.quoteService.updateOrderGiverAcceptance(+id)
  }
}
