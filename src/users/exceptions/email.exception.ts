import { HttpException, HttpStatus } from "@nestjs/common";

export class EmailException extends HttpException {
  constructor() {
    super('email already exists!', HttpStatus.CONFLICT);
  }
}
