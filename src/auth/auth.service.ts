import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  async userUUID(request: Request): Promise<string> {
    if (!request.cookies['jwt']) throw new ForbiddenException();
    const cookie = request.cookies['jwt'];
    const data = await this.jwtService.verifyAsync(cookie);
    console.log('data', data);
    return data['uuid'];
  }
}
