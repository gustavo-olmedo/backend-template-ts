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
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Response, Request } from 'express';
import { OAuth2Client } from 'google-auth-library';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth.service';
import { RolesService } from '../roles/roles.service';
import { PasswordTokenService } from './password-token.service';
import { PasswordToken } from './models/password-token.entity';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { MailService } from 'src/mail/mail.service';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class AuthController {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private authService: AuthService,
    private rolesService: RolesService,
    private passwordTokenService: PasswordTokenService,
    private mailService: MailService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    if (body.password !== body.passwordConfirm) {
      throw new BadRequestException('Password do not match!');
    }
    const regularRole = await this.rolesService.findOne({ name: 'regular' });
    const hashedPassword = await bcrypt.hash(body.password, 12);
    return this.usersService.save({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: hashedPassword,
      role: { uuid: regularRole?.uuid }, // regular role uuid
    });
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.usersService.findOne({
      email,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Invalid credentials');
    }

    const jwt = await this.jwtService.signAsync({
      uuid: user.uuid,
    });

    response.cookie('jwt', jwt, { httpOnly: true });

    return { user, accessToken: jwt };
  }

  @UseGuards(AuthGuard)
  @Get('user')
  async user(@Req() request: Request) {
    const uuid = await this.authService.userUUID(request);
    return this.usersService.findOne({ uuid }, ['role']);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('jwt');
    return {
      message: 'Success',
    };
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
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    if (password !== passwordConfirm) {
      throw new BadRequestException('Passwords do not match.');
    }

    const rec = await this.passwordTokenService.verify(token, type);

    const hashedPassword = await bcrypt.hash(password, 12);
    await this.usersService.update(rec.user.uuid, { password: hashedPassword });

    // Invalidate all outstanding invite/reset tokens for this user
    await this.passwordTokenService.revokeAllForUser(rec.user.uuid, type);

    // Finally consume the presented token (harmless if already covered by revokeAll)
    await this.passwordTokenService.consume(token, type);

    return { ok: true, message: 'Password updated' };
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

  @Post('sso/google')
  async ssoGoogle(
    @Body('idToken') idToken: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!idToken) throw new BadRequestException('Missing idToken');

    // Verify id_token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new BadRequestException('Invalid Google token');

    // Required Google claims we'll use
    const {
      sub: googleSub,
      email,
      email_verified,
      given_name,
      family_name,
      picture,
    } = payload;

    if (!email || !email_verified) {
      throw new BadRequestException('Unverified Google account');
    }

    // Upsert/find the user in your DB
    let user = await this.usersService.findOne({ email });

    if (!user) {
      // First time: create a “regular” user
      const regularRole = await this.rolesService.findOne({ name: 'regular' });

      user = await this.usersService.save({
        firstName: given_name ?? 'Google',
        lastName: family_name ?? 'User',
        email,
        // No password for SSO users
        password: null,
        avatarUrl: picture ?? null,
        role: regularRole ? { uuid: regularRole.uuid } : undefined,
      });
    }

    // TODO: Persist the identity mapping in your DB
    // In the auth_identities table, upsert (provider='google', provider_uid=googleSub, user_id=user.uuid) here.

    const jwt = await this.jwtService.signAsync({ uuid: user.uuid });

    response.cookie('jwt', jwt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return { user, accessToken: jwt };
  }
}
