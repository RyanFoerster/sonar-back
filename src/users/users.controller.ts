import {
  Body,
  Controller,
  Get,
  Logger,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dtos/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  private readonly logger = new Logger('UsersController');

  @Get()
  async findConnectedUser(@Request() req) {
    try {
      return await this.usersService.findOne(req.user.id);
    } catch (e) {
      throw new UnauthorizedException(e.message);
    }
  }

  @Get('all')
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('groups')
  async findAllUsersGroup(@Request() req, @Query() params: string) {
    return await this.usersService.findAllUsersGroup(params);
  }

  @Patch()
  async updateAddress(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.updateAddress(req.user.id, updateUserDto);
  }
}
