import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionService.create(createTransactionDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.transactionService.findAll(paginationDto);
  }

  @Get('recipient-principal/:id')
  async findRecipientPrincipalTransactionById(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const [data, total] =
      await this.transactionService.findRecipientPrincipalTransactionById(
        +id,
        paginationDto,
      );
    return {
      data,
      meta: {
        total,
        page: paginationDto.page || 1,
        limit: paginationDto.limit || 10,
        totalPages: Math.ceil(total / (paginationDto.limit || 10)),
      },
    };
  }

  @Get('sender-principal/:id')
  async findSenderPrincipalTransactionById(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const [data, total] =
      await this.transactionService.findSenderPrincipalTransactionById(
        +id,
        paginationDto,
      );
    return {
      data,
      meta: {
        total,
        page: paginationDto.page || 1,
        limit: paginationDto.limit || 10,
        totalPages: Math.ceil(total / (paginationDto.limit || 10)),
      },
    };
  }

  @Get('recipient-group/:id')
  async findRecipientGroupTransactionById(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const [data, total] =
      await this.transactionService.findRecipientGroupTransactionById(
        +id,
        paginationDto,
      );
    return {
      data,
      meta: {
        total,
        page: paginationDto.page || 1,
        limit: paginationDto.limit || 10,
        totalPages: Math.ceil(total / (paginationDto.limit || 10)),
      },
    };
  }

  @Get('sender-group/:id')
  async findSenderGroupTransactionById(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const [data, total] =
      await this.transactionService.findSenderGroupTransactionById(
        +id,
        paginationDto,
      );
    return {
      data,
      meta: {
        total,
        page: paginationDto.page || 1,
        limit: paginationDto.limit || 10,
        totalPages: Math.ceil(total / (paginationDto.limit || 10)),
      },
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionService.update(+id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionService.remove(+id);
  }
}
