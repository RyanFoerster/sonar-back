import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  Logger,
} from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@Controller('beneficiaries')
export class BeneficiariesController {
  private readonly logger = new Logger(BeneficiariesController.name);

  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Post()
  create(@Body() createBeneficiaryDto: CreateBeneficiaryDto, @Req() req) {
    return this.beneficiariesService.create(createBeneficiaryDto, req.user.id);
  }

  @Get()
  findAll(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.beneficiariesService.findAll(
      req.user.id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('search')
  search(@Query('query') query: string, @Req() req) {
    return this.beneficiariesService.search(query, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.beneficiariesService.findOne(+id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBeneficiaryDto: UpdateBeneficiaryDto,
    @Req() req,
  ) {
    return this.beneficiariesService.update(
      +id,
      updateBeneficiaryDto,
      req.user.id,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.beneficiariesService.remove(+id, req.user.id);
  }
}
