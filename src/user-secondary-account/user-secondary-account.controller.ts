import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UserSecondaryAccountService } from './user-secondary-account.service';
import { CreateUserSecondaryAccountDto } from './dto/create-user-secondary-account.dto';
import { UpdateUserSecondaryAccountDto } from './dto/update-user-secondary-account.dto';
import { JwtAuthGuard } from '@/guards/auth.guard';

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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userSecondaryAccountService.remove(id);
  }

  @Delete('groups/:groupId/leave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async leaveGroup(
    @Request() req,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    const userId = req.user.id;
    return this.userSecondaryAccountService.leaveGroup(userId, groupId);
  }

  @Delete('groups/:groupId/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Request() req,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    const adminUserId = req.user.id;
    const role = req.user.role;
    return this.userSecondaryAccountService.removeMember(
      adminUserId,
      memberId,
      groupId,
      role,
    );
  }
}
