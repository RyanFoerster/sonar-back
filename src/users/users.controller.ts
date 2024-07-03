import { Controller, Get, Logger, Request, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "./users.service";

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
}
