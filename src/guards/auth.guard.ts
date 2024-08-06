import { ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from "express";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt'){
  constructor(private reflector: Reflector) {
    super()
  }
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    return request.headers.authorization?.split(" ")[1];

  }
}