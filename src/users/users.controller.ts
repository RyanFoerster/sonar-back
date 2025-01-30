import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Query,
  Req,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import * as process from 'node:process';
import { join } from 'path';
import { UpdateUserDto } from './dtos/update-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

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

  @Get('pending')
  async findAllPendingUser(@Request() req) {
    const user = await this.findConnectedUser(req);
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException(
        'You do not have permission to perform this action.',
      );
    }

    return await this.usersService.findAllPendingUser();
  }

  @Get('principal-account/:id')
  async findUserByPrincipalAccountId(@Param('id') id: number) {
    return await this.usersService.findUserByPrincipalAccountId(id);
  }

  @Get('secondary-account/:id')
  async findUserBySecondaryAccountId(@Param('id') id: number) {
    return await this.usersService.findUserBySecondaryAccountId(id);
  }

  @Patch()
  async updateAddress(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return await this.usersService.updateAddress(req.user.id, updateUserDto);
  }

  @Patch('toggleActive')
  async toggleActiveUser(@Request() req, @Body() userToActive: User) {
    const user = await this.findConnectedUser(req);
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException(
        'You do not have permission to perform this action.',
      );
    }

    return await this.usersService.toggleActiveUser(userToActive);
  }

  /*@UseInterceptors(FileInterceptor('file'))
  @Post('profile-picture')
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    Logger.debug(process.env.DRIVE_CLIENT_EMAIL);
    const user = await this.usersService.findOne(req.id);
    return this.usersService.updateProfilePicture(user, file);
  }*/

  @Get(':imgpath')
  seeUploadedFile(@Param('imgpath') image, @Res() res: Response) {
    const imagePath = join(process.cwd(), 'uploads', image);
    return res.sendFile(imagePath);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @Req() req) {
    const user = await this.findConnectedUser(req);
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException(
        'You do not have permission to perform this action.',
      );
    }
    return this.usersService.delete(+id);
  }
}
