import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Request } from 'express';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    authService = new AuthService(jwtService);
  });

  it('should return Id from valid jwt cookie', async () => {
    const mockId = '1234-id';
    const mockCookie = 'valid.jwt.token';
    const mockRequest = {
      cookies: {
        jwt: mockCookie,
      },
    } as unknown as Request;

    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ id: mockId });

    const result = await authService.userId(mockRequest);
    expect(result).toBe(mockId);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockCookie);
  });

  it('should throw ForbiddenException if jwt cookie is missing', async () => {
    const mockRequest = {
      cookies: {},
    } as Request;

    await expect(authService.userId(mockRequest)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw if jwt is invalid', async () => {
    const mockRequest = {
      cookies: {
        jwt: 'invalid.token',
      },
    } as unknown as Request;

    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
      new Error('Invalid token'),
    );

    await expect(authService.userId(mockRequest)).rejects.toThrow();
  });
});
