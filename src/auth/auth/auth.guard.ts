import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}
  canActivate(context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();
      const jwt = request.cookies['jwt'];
      if (!jwt) throw new UnauthorizedException();

      return this.jwtService.verify(jwt);
    } catch (err) {
      console.error('JWT verification error:', err);
      throw new ForbiddenException();
    }
  }
}
