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
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { AuthIdentitiesService } from './auth-identities.service';
import { RegisterDto } from './dtos/register.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { PasswordTokenService } from './password-token.service';
import { AuthGuard } from './auth/auth.guard';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dtos/login.dto';
import { Device } from '../devices/models/device.entity';
import { DevicesService } from '../devices/devices.service';
import { LoginSSODto } from './dtos/login-sso.dto';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class AuthController {
  constructor(
    private usersService: UsersService,
    private roles: RolesService,
    private authService: AuthService,
    private sessionsService: SessionsService,
    private authIdentitiesService: AuthIdentitiesService,
    private passwordTokens: PasswordTokenService,
    private jwtService: JwtService,
    private passwordTokenService: PasswordTokenService,
    private mailService: MailService,
    private devicesService: DevicesService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    if (body.password !== body.passwordConfirm) {
      throw new BadRequestException('Password do not match!');
    }
    const regularRole = await this.roles.findOne({ name: 'regular' });
    const user = await this.usersService.save({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      role: { id: regularRole?.id },
    });
    // Password a identity
    await this.authIdentitiesService.upsertPassword(user, body.password);
    return user;
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.usersService.findOne({ email: body.email });
    if (!user) throw new NotFoundException('User not found');
    const ok = await this.authIdentitiesService.comparePassword(
      user,
      body.password,
    );
    if (!ok) throw new BadRequestException('Invalid credentials');

    await this.authIdentitiesService.touchPasswordLogin(user, body.password);
    let device: Device | undefined;
    if (body.appInstanceId) {
      device = await this.devicesService.upsertByInstance(
        user,
        body.appInstanceId,
        {
          platform: body.platform ?? 'web',
          pushToken: body.pushToken,
          locale: body.locale,
          timezone: body.timezone,
          model: body.model,
          osVersion: body.osVersion,
          appVersion: body.appVersion,
        },
      );
    }

    // Run the DB parts atomically
    const { access, refresh } = await this.sessionsService.withTransaction(
      async (sessionRepository) => {
        // INSERT shell session (DB generates id)
        const placeholderHash = await bcrypt.hash(
          `placeholder:${randomUUID()}`,
          Number(process.env.BCRYPT_COST) || 12,
        );
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const shell = await sessionRepository.save(
          sessionRepository.create({
            user,
            refreshTokenHash: placeholderHash,
            expiresAt: expires,
            ip: req.ip,
            userAgent: req.headers['user-agent'] as string | undefined,
            device,
          }),
        );

        // Sign tokens ONCE with the real session id
        const access = await this.authService.signAccessToken(user, shell.id); // e.g. 15m
        const refresh = await this.authService.signRefreshToken(user, shell.id); // e.g. 30d

        // UPDATE row with the real refresh hash
        await sessionRepository.update(
          { id: shell.id },
          {
            refreshTokenHash: await bcrypt.hash(
              refresh,
              Number(process.env.BCRYPT_COST) || 12,
            ),
          },
        );

        return { access, refresh };
      },
    );

    // Only set cookies after the tx succeeds
    this.authService.setAuthCookies(res, access, refresh);
    return { user, accessToken: access };
  }

  @Post('token/refresh')
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

    if (
      payload.typ !== (process.env.AUTH_REFRESH_COOKIE_NAME ?? 'refresh_token')
    )
      throw new BadRequestException('Invalid token type');
    const { sub: userId, sid: sessionId } = payload;

    // Valida contra DB (no revocado, match hash, no expirado)
    const valid = await this.sessionsService.isValid(sessionId, refresh);
    if (!valid) throw new BadRequestException('Session invalid');

    // Emite nuevos tokens (rotación opcional manteniendo la misma sesión)
    const user = await this.usersService.findOne({ id: userId });

    if (!user) throw new BadRequestException('User not found.');

    const newAccess = await this.authService.signAccessToken(user, sessionId);
    const newRefresh = await this.authService.signRefreshToken(user, sessionId);

    // Rotate the stored hash while preserving the sid embedded in both tokens.
    await this.sessionsService.rotate(sessionId, newRefresh, 30);

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
    await this.passwordTokens.revokeAllForUser(rec.user.id, type);
    await this.passwordTokens.consume(token, type);

    return { ok: true, message: 'Password updated' };
  }

  @Post('sso/google')
  async ssoGoogle(
    @Body() body: LoginSSODto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.idToken) throw new BadRequestException('Missing idToken');

    const ticket = await googleClient.verifyIdToken({
      idToken: body.idToken,
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

    let user = await this.usersService.findOne({ email });
    if (!user) {
      const regular = await this.roles.findOne({ name: 'regular' });
      user = await this.usersService.save({
        firstName: given_name ?? 'Google',
        lastName: family_name ?? 'User',
        email,
        avatarUrl: picture ?? null,
        role: regular ? { id: regular.id } : undefined,
      });
    }

    await this.authIdentitiesService.upsertSso(user, 'google', googleSub);
    let device: Device | undefined;
    if (body.appInstanceId) {
      device = await this.devicesService.upsertByInstance(
        user,
        body.appInstanceId,
        {
          platform: body.platform ?? 'web',
          pushToken: body.pushToken,
          locale: body.locale,
          timezone: body.timezone,
          model: body.model,
          osVersion: body.osVersion,
          appVersion: body.appVersion,
        },
      );
    }

    // Run the DB parts atomically
    const { access, refresh } = await this.sessionsService.withTransaction(
      async (sessionRepository) => {
        // INSERT shell session (DB generates id)
        const placeholderHash = await bcrypt.hash(
          `placeholder:${randomUUID()}`,
          Number(process.env.BCRYPT_COST) || 12,
        );
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const shell = await sessionRepository.save(
          sessionRepository.create({
            user,
            refreshTokenHash: placeholderHash,
            expiresAt: expires,
            ip: req.ip,
            userAgent: req.headers['user-agent'] as string | undefined,
            device,
          }),
        );

        // Sign tokens ONCE with the real session id
        const access = await this.authService.signAccessToken(user, shell.id); // e.g. 15m
        const refresh = await this.authService.signRefreshToken(user, shell.id); // e.g. 30d

        // UPDATE row with the real refresh hash
        await sessionRepository.update(
          { id: shell.id },
          {
            refreshTokenHash: await bcrypt.hash(
              refresh,
              Number(process.env.BCRYPT_COST) || 12,
            ),
          },
        );

        return { access, refresh };
      },
    );

    // Only set cookies after the tx succeeds
    this.authService.setAuthCookies(res, access, refresh);
    return { user, accessToken: access };
  }

  @UseGuards(AuthGuard)
  @Get('user')
  async me(@Req() req: Request) {
    const id = await this.authService.getUserId(req);
    return this.usersService.findOne({ id }, ['role']);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const { email } = body;

    // Do not leak whether the user exists
    const user = await this.usersService.findOne({ email });
    if (!user) {
      return {
        ok: true,
        message: 'If that email exists, we sent a reset link.',
      };
    }

    // Use a dedicated token type for resets
    const token = await this.passwordTokenService.issue(user, 'reset');
    const link = `${process.env.PUBLIC_FE_APP_URL}/set-password?token=${encodeURIComponent(
      token,
    )}&type=reset`;

    await this.mailService.sendReset(user.email, link);
    return { ok: true, message: 'If that email exists, we sent a reset link.' };
  }
}
