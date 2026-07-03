import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;

  beforeEach(() => {
    process.env.AUTH_COOKIE_NAME = 'access_token';
    jwtService = { verifyAsync: jest.fn() };
    authService = new AuthService(jwtService as unknown as JwtService);
  });

  it('returns the subject from a valid access-token cookie', async () => {
    const request = {
      cookies: { access_token: 'valid.jwt.token' },
      headers: {},
    } as unknown as Request;
    jwtService.verifyAsync.mockResolvedValue({
      sub: '1234-id',
      sid: 'session-id',
      typ: 'access_token',
    });

    await expect(authService.getUserId(request)).resolves.toBe('1234-id');
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token');
  });

  it('accepts a bearer token when the cookie is absent', async () => {
    const request = {
      cookies: {},
      headers: { authorization: 'Bearer bearer.jwt.token' },
    } as unknown as Request;
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      sid: 'session-id',
      typ: 'access_token',
    });

    await expect(authService.getUserId(request)).resolves.toBe('user-id');
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('bearer.jwt.token');
  });

  it('throws UnauthorizedException when credentials are missing', async () => {
    const request = { cookies: {}, headers: {} } as unknown as Request;

    await expect(authService.getUserId(request)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException when the token is invalid', async () => {
    const request = {
      cookies: { access_token: 'invalid.token' },
      headers: {},
    } as unknown as Request;
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    await expect(authService.getUserId(request)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException for a non-access token', async () => {
    const request = {
      cookies: { access_token: 'refresh.token' },
      headers: {},
    } as unknown as Request;
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      sid: 'session-id',
      typ: 'refresh_token',
    });

    await expect(authService.getUserId(request)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
