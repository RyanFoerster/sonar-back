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
  UploadedFile,
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '@/auth/decorators/public.decorator';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @UseInterceptors(FileInterceptor('attachment'))
  create(
    @Body() body: { data: string },
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const createQuoteDto = JSON.parse(body.data) as CreateQuoteDto;
    return this.quoteService.create(createQuoteDto, req.user.id, file);
  }

  @Get()
  findAll() {
    return this.quoteService.findQuoteWithoutInvoice();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.quoteService.update(id, updateQuoteDto, req.user.id, file);
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
}
