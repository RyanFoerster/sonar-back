import { PartialType } from "@nestjs/mapped-types";
import { CreateUserSecondaryAccountDto } from "./create-user-secondary-account.dto";

export class UpdateUserSecondaryAccountDto extends PartialType(CreateUserSecondaryAccountDto) {}
