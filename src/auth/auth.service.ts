import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  async userUUID(request: Request): Promise<string> {
    if (!request.cookies['jwt']) throw new UnauthorizedException();
    try {
      const cookie = request.cookies['jwt'];
      const data = await this.jwtService.verifyAsync(cookie);
      return data['uuid'];
    } catch (error) {
      console.log('error', error);
      throw new ForbiddenException();
    }
  }
}
