import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;

  const contextFor = (cookies: Record<string, string>) => {
    const request: { cookies: Record<string, string>; userId?: string } = {
      cookies,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    process.env.AUTH_COOKIE_NAME = 'access_token';
    jwtService = { verifyAsync: jest.fn() };
    guard = new AuthGuard(jwtService as unknown as JwtService);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('verifies the configured cookie and adds userId to the request', async () => {
    const { context, request } = contextFor({ access_token: 'jwt-token' });
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });

    await expect(guard.canActivate(context)).resolves.toEqual({
      sub: 'user-id',
    });
    expect(request).toEqual({
      cookies: { access_token: 'jwt-token' },
      userId: 'user-id',
    });
  });

  it('throws ForbiddenException when the cookie is absent', async () => {
    const { context } = contextFor({});
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when verification fails', async () => {
    const { context } = contextFor({ access_token: 'invalid' });
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
