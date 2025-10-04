import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { User } from '../users/models/user.entity';

type JwtPayload = { sub: string; sid: string; typ: 'access' | 'refresh' };

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  async signAccessToken(user: User, sessionId: string) {
    return this.jwtService.signAsync(
      { sub: user.id, sid: sessionId, typ: 'access' } as JwtPayload,
      { expiresIn: '15m' },
    );
  }

  async signRefreshToken(user: User, sessionId: string) {
    return this.jwtService.signAsync(
      { sub: user.id, sid: sessionId, typ: 'refresh' } as JwtPayload,
      { expiresIn: '30d' },
    );
  }

  setAuthCookies(res: Response, access: string, refresh: string) {
    const base = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
    res.cookie('access_token', access, { ...base, maxAge: 15 * 60 * 1000 }); // 15m
    res.cookie('refresh_token', refresh, {
      ...base,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
    });
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  // Extract userId from access token
  async userId(request: Request): Promise<string> {
    const raw =
      request.cookies['access_token'] ??
      (request.headers.authorization?.startsWith('Bearer ')
        ? request.headers.authorization.slice(7)
        : undefined);
    if (!raw) throw new UnauthorizedException();
    try {
      const data = await this.jwtService.verifyAsync<JwtPayload>(raw);
      if (data.typ !== 'access') throw new ForbiddenException();
      return data.sub;
    } catch {
      throw new ForbiddenException();
    }
  }
}
