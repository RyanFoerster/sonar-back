import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from "@nestjs/common";
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  create(@Body() createQuoteDto: CreateQuoteDto, @Req() req) {
    return this.quoteService.create(createQuoteDto, req.user.id);
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
  update(@Param('id') id: string, @Body() updateQuoteDto: UpdateQuoteDto, @Req() req) {
    return this.quoteService.update(id, updateQuoteDto, req.user.id);
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

  @Patch(':id/group_rejection')
  updateQuoteGroupRejection(@Param('id') id: string) {
    return this.quoteService.updateQuoteGroupRejection(+id)
  }

  @Patch(':id/order_giver_rejection')
  updateOrderGiverRejection(@Param('id') id: string) {
    return this.quoteService.updateOrderGiverRejection(+id)
  }


}
