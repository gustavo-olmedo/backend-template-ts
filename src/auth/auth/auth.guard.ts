import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestWithId } from '../interfaces/request-with-id.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<RequestWithId>();
    try {
      const request = context.switchToHttp().getRequest();
      const jwt = request.cookies['jwt'];
      if (!jwt) throw new UnauthorizedException();

      const payload = await this.jwtService.verifyAsync(jwt);
      req.userId = payload.sub;

      return payload;
    } catch (err) {
      console.error('JWT verification error:', err);
      throw new ForbiddenException();
    }
  }
}
