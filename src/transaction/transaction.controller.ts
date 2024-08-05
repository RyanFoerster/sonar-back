import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionService.create(createTransactionDto);
  }

  @Get()
  findAll() {
    return this.transactionService.findAll();
  }

  @Get('recipient-principal/:id')
  async findRecipientPrincipalTransactionById(@Param("id") id: string) {
    const data = await this.transactionService.findRecipientPrincipalTransactionById(+id);
    if (data.length > 0) {
      return data;
    } else {
      return [];
    }
  }

  @Get('sender-principal/:id')
  async findSenderPrincipalTransactionById(@Param('id') id: string) {
    const data = await this.transactionService.findSenderPrincipalTransactionById(+id);
    if (data.length > 0) {
      return data;
    } else {
      return [];
    }
  }

  @Get('recipient-group/:id')
  async findRecipientGroupTransactionById(@Param("id") id: string) {
    const data = await this.transactionService.findRecipientGroupTransactionById(+id);
    if (data.length > 0) {
      return data;
    } else {
      return [];
    }
  }

  @Get('sender-group/:id')
  async findSenderGroupTransactionById(@Param('id') id: string) {
    const data = await this.transactionService.findSenderGroupTransactionById(+id);
    if (data.length > 0) {
      return data;
    } else {
      return [];
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
    return this.transactionService.update(+id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionService.remove(+id);
  }
}
