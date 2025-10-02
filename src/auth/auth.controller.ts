// src/auth/auth.controller.ts (fragmentos clave)
import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response, Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { AuthIdentitiesService } from './auth-identities.service';
import { RegisterDto } from './dtos/register.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { PasswordTokenService } from './password-token.service';
import { AuthGuard } from './auth/auth.guard';
import { JwtService } from '@nestjs/jwt';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class AuthController {
  constructor(
    private users: UsersService,
    private roles: RolesService,
    private authService: AuthService,
    private sessionsService: SessionsService,
    private authIdentitiesService: AuthIdentitiesService,
    private passwordTokens: PasswordTokenService,
    private jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    if (body.password !== body.passwordConfirm) {
      throw new BadRequestException('Password do not match!');
    }
    const regularRole = await this.roles.findOne({ name: 'regular' });
    const user = await this.users.save({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: null, // DEPRECADO
      role: { uuid: regularRole?.uuid },
    });
    // Password a identity
    await this.authIdentitiesService.upsertPassword(user, body.password);
    return user;
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.users.findOne({ email });
    if (!user) throw new NotFoundException('User not found');

    const ok = await this.authIdentitiesService.comparePassword(user, password);
    if (!ok) throw new BadRequestException('Invalid credentials');

    // Crea sesión + refresh token firmado
    // Nota: el token firmado (string) se guarda en cookie; el hash va a DB
    const refreshJwt = await this.authService.signRefreshToken(user, 'tmp'); // 'tmp' hasta tener sessionId
    // Creamos la sesión con el valor del refreshJwt
    const session = await this.sessionsService.create(user, refreshJwt, 30, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    // Refirmamos con sid correcto
    const refresh = await this.authService.signRefreshToken(user, session.id);
    const access = await this.authService.signAccessToken(user, session.id);

    // Importante: rehasear y guardar el nuevo refresh (opcional simplificar: crea sesión después)
    await this.sessionsService.revokeById(session.id); // revoca tmp
    const session2 = await this.sessionsService.create(user, refresh, 30, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    const access2 = await this.authService.signAccessToken(user, session2.id);
    const refresh2 = await this.authService.signRefreshToken(user, session2.id);

    this.authService.setAuthCookies(res, access2, refresh2);
    return { user, accessToken: access2 };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refresh = req.cookies['refresh_token'];
    if (!refresh) throw new BadRequestException('Missing refresh token');

    // Verifica firma y extrae claims
    const payload = await (async () => {
      try {
        return await this.jwtService.verifyAsync(refresh);
      } catch {
        throw new BadRequestException('Invalid refresh');
      }
    })();

    if (payload.typ !== 'refresh')
      throw new BadRequestException('Invalid token type');
    const { sub: userUUID, sid: sessionId } = payload;

    // Valida contra DB (no revocado, match hash, no expirado)
    const valid = await this.sessionsService.isValid(sessionId, refresh);
    if (!valid) throw new BadRequestException('Session invalid');

    // Emite nuevos tokens (rotación opcional manteniendo la misma sesión)
    const user = await this.users.findOne({ uuid: userUUID });

    if (!user) throw new BadRequestException('User not found.');

    const newAccess = await this.authService.signAccessToken(user, sessionId);
    const newRefresh = await this.authService.signRefreshToken(user, sessionId);

    // Actualiza hash guardado para prevenir reuso (opcional: crear endpoint en SessionsService)
    await this.sessionsService.create(user, newRefresh, 30); // crea nueva y revoca la anterior
    await this.sessionsService.revokeById(sessionId);

    this.authService.setAuthCookies(res, newAccess, newRefresh);
    return { ok: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh = req.cookies['refresh_token'];
    if (refresh) {
      try {
        const payload = await this.jwtService.verifyAsync(refresh);
        if (payload?.sid) await this.sessionsService.revokeById(payload.sid);
      } catch {}
    }
    this.authService.clearAuthCookies(res);
    return { message: 'Success' };
  }

  @Post('set-password')
  async setPassword(
    @Body('token') token: string,
    @Body('password') password: string,
    @Body('passwordConfirm') passwordConfirm: string,
    @Body('type') type: 'invite' | 'reset',
  ) {
    if (!token) throw new BadRequestException('Missing token');
    if (!type) throw new BadRequestException('Missing operation type');
    if (!password || password.length < 8)
      throw new BadRequestException('Password must be at least 8 characters');
    if (password !== passwordConfirm)
      throw new BadRequestException('Passwords do not match.');

    const rec = await this.passwordTokens.verify(token, type);
    await this.authIdentitiesService.upsertPassword(rec.user, password);
    await this.passwordTokens.revokeAllForUser(rec.user.uuid, type);
    await this.passwordTokens.consume(token, type);

    return { ok: true, message: 'Password updated' };
  }

  @Post('sso/google')
  async ssoGoogle(
    @Body('idToken') idToken: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idToken) throw new BadRequestException('Missing idToken');

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new BadRequestException('Invalid Google token');

    const {
      sub: googleSub,
      email,
      email_verified,
      given_name,
      family_name,
      picture,
    } = payload;
    if (!email || !email_verified)
      throw new BadRequestException('Unverified Google account');

    let user = await this.users.findOne({ email });
    if (!user) {
      const regular = await this.roles.findOne({ name: 'regular' });
      user = await this.users.save({
        firstName: given_name ?? 'Google',
        lastName: family_name ?? 'User',
        email,
        password: null,
        avatarUrl: picture ?? null,
        role: regular ? { uuid: regular.uuid } : undefined,
      });
    }

    await this.authIdentitiesService.upsertSso(user, 'google', googleSub);

    // Crea sesión + cookies
    const refreshTmp = await this.authService.signRefreshToken(user, 'tmp');
    const s = await this.sessionsService.create(user, refreshTmp, 30, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
    const access = await this.authService.signAccessToken(user, s.id);
    const refresh = await this.authService.signRefreshToken(user, s.id);

    // opcional: rotación igual que en login
    this.authService.setAuthCookies(res, access, refresh);
    return { user, accessToken: access };
  }

  @UseGuards(AuthGuard)
  @Get('user')
  async me(@Req() req: Request) {
    const uuid = await this.authService.userUUID(req);
    return this.users.findOne({ uuid }, ['role']);
  }
}
