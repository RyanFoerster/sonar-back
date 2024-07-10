import { HttpException, HttpStatus } from "@nestjs/common";

export class UsernameException extends HttpException {
  constructor() {
    super('Username already exists!', HttpStatus.CONFLICT);
  }
}