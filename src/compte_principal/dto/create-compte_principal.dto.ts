import { IsString } from "class-validator";

export class CreateComptePrincipalDto {

    @IsString()
    username: string
}
