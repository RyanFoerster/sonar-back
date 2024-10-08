import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserSecondaryAccountService } from './user-secondary-account.service';
import { CreateUserSecondaryAccountDto } from './dto/create-user-secondary-account.dto';
import { UpdateUserSecondaryAccountDto } from './dto/update-user-secondary-account.dto';

@Controller('user-secondary-account')
export class UserSecondaryAccountController {
  constructor(
    private readonly userSecondaryAccountService: UserSecondaryAccountService,
  ) {}

  @Post()
  create(
    @Body() createUserSecondaryAccountDto: CreateUserSecondaryAccountDto,
    @Query() params: string,
  ) {
    return this.userSecondaryAccountService.create(
      createUserSecondaryAccountDto,
      params,
    );
  }

  @Get()
  findAll() {
    return this.userSecondaryAccountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userSecondaryAccountService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserSecondaryAccountDto: UpdateUserSecondaryAccountDto,
  ) {
    return this.userSecondaryAccountService.update(
      +id,
      updateUserSecondaryAccountDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userSecondaryAccountService.remove(+id);
  }
}
