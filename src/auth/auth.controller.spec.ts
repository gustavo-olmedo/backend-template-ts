import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { AuthIdentitiesService } from './auth-identities.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordTokenService } from './password-token.service';
import { SessionsService } from './sessions.service';
import { DevicesService } from '../devices/devices.service';
import { MailService } from '../mail/mail.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';

jest.mock('bcryptjs', () => ({ hash: jest.fn() }));

describe('AuthController', () => {
  let controller: AuthController;
  const usersService = { save: jest.fn(), findOne: jest.fn() };
  const rolesService = { findOne: jest.fn() };
  const authService = {
    getUserId: jest.fn(),
    signAccessToken: jest.fn(),
    signRefreshToken: jest.fn(),
    setAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn(),
  };
  const sessionsService = {
    withTransaction: jest.fn(),
    isValid: jest.fn(),
    create: jest.fn(),
    rotate: jest.fn(),
    revokeById: jest.fn(),
  };
  const identitiesService = {
    upsertPassword: jest.fn(),
    comparePassword: jest.fn(),
    touchPasswordLogin: jest.fn(),
    upsertSso: jest.fn(),
  };
  const passwordTokenService = {
    verify: jest.fn(),
    issue: jest.fn(),
    revokeAllForUser: jest.fn(),
    consume: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: RolesService, useValue: rolesService },
        { provide: AuthService, useValue: authService },
        { provide: SessionsService, useValue: sessionsService },
        { provide: AuthIdentitiesService, useValue: identitiesService },
        { provide: PasswordTokenService, useValue: passwordTokenService },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: MailService, useValue: { sendReset: jest.fn() } },
        { provide: DevicesService, useValue: { upsertByInstance: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('registers a user and creates its password identity', async () => {
    const dto = {
      firstName: 'Gustavo',
      lastName: 'Olmedo',
      email: 'golmedo@mail.com',
      password: 'pass123',
      passwordConfirm: 'pass123',
    };
    const savedUser = { id: 'user-id', ...dto };
    rolesService.findOne.mockResolvedValue({ id: 'role-id' });
    usersService.save.mockResolvedValue(savedUser);

    await expect(controller.register(dto)).resolves.toEqual(savedUser);
    expect(usersService.save).toHaveBeenCalledWith({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      role: { id: 'role-id' },
    });
    expect(identitiesService.upsertPassword).toHaveBeenCalledWith(
      savedUser,
      dto.password,
    );
  });

  it('rejects registration when passwords do not match', async () => {
    await expect(
      controller.register({
        firstName: 'Gustavo',
        lastName: 'Olmedo',
        email: 'golmedo@mail.com',
        password: 'a',
        passwordConfirm: 'b',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('logs in, creates a session, and sets both auth cookies', async () => {
    const user = { id: 'user-id', email: 'golmedo@mail.com' };
    const request = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as unknown as Request;
    const response = {} as Response;
    const sessionRepository = {
      create: jest.fn().mockReturnValue({ user }),
      save: jest.fn().mockResolvedValue({ id: 'session-id' }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    usersService.findOne.mockResolvedValue(user);
    identitiesService.comparePassword.mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    authService.signAccessToken.mockResolvedValue('access-token');
    authService.signRefreshToken.mockResolvedValue('refresh-token');
    sessionsService.withTransaction.mockImplementation((callback) =>
      callback(sessionRepository),
    );

    await expect(
      controller.login(
        { email: user.email, password: 'plaintext' },
        request,
        response,
      ),
    ).resolves.toEqual({ user, accessToken: 'access-token' });
    expect(identitiesService.comparePassword).toHaveBeenCalledWith(
      user,
      'plaintext',
    );
    expect(identitiesService.touchPasswordLogin).toHaveBeenCalledWith(
      user,
      'plaintext',
    );
    expect(authService.setAuthCookies).toHaveBeenCalledWith(
      response,
      'access-token',
      'refresh-token',
    );
  });

  it('throws NotFoundException when the login user does not exist', async () => {
    usersService.findOne.mockResolvedValue(null);

    await expect(
      controller.login(
        { email: 'missing@mail.com', password: 'any' },
        {} as Request,
        {} as Response,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for an incorrect password', async () => {
    usersService.findOne.mockResolvedValue({ id: 'user-id' });
    identitiesService.comparePassword.mockResolvedValue(false);

    await expect(
      controller.login(
        { email: 'email@mail.com', password: 'wrong' },
        {} as Request,
        {} as Response,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns the current user', async () => {
    const request = {} as Request;
    const user = { id: 'user-id', email: 'user@mail.com' };
    authService.getUserId.mockResolvedValue('user-id');
    usersService.findOne.mockResolvedValue(user);

    await expect(controller.me(request)).resolves.toEqual(user);
    expect(usersService.findOne).toHaveBeenCalledWith({ id: 'user-id' }, [
      'role',
    ]);
  });

  it('rotates refresh tokens on the existing session', async () => {
    process.env.AUTH_REFRESH_COOKIE_NAME = 'refresh_token';
    const jwtService = controller['jwtService'] as unknown as {
      verifyAsync: jest.Mock;
    };
    const user = { id: 'user-id' };
    const request = {
      cookies: { refresh_token: 'old-refresh-token' },
    } as unknown as Request;
    const response = {} as Response;
    jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      sid: 'session-id',
      typ: 'refresh_token',
    });
    sessionsService.isValid.mockResolvedValue(true);
    usersService.findOne.mockResolvedValue(user);
    authService.signAccessToken.mockResolvedValue('new-access-token');
    authService.signRefreshToken.mockResolvedValue('new-refresh-token');

    await expect(controller.refresh(request, response)).resolves.toEqual({
      ok: true,
    });
    expect(sessionsService.rotate).toHaveBeenCalledWith(
      'session-id',
      'new-refresh-token',
      30,
    );
    expect(authService.setAuthCookies).toHaveBeenCalledWith(
      response,
      'new-access-token',
      'new-refresh-token',
    );
    expect(sessionsService.revokeById).not.toHaveBeenCalled();
  });

  it('revokes the refresh session and clears cookies on logout', async () => {
    const jwtService = controller['jwtService'] as unknown as {
      verifyAsync: jest.Mock;
    };
    jwtService.verifyAsync.mockResolvedValue({ sid: 'session-id' });
    const request = {
      cookies: { refresh_token: 'refresh-token' },
    } as unknown as Request;
    const response = {} as Response;

    await expect(controller.logout(request, response)).resolves.toEqual({
      message: 'Success',
    });
    expect(sessionsService.revokeById).toHaveBeenCalledWith('session-id');
    expect(authService.clearAuthCookies).toHaveBeenCalledWith(response);
  });
});
