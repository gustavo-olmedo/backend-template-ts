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

  it('should return UUID from valid jwt cookie', async () => {
    const mockUUID = '1234-uuid';
    const mockCookie = 'valid.jwt.token';
    const mockRequest = {
      cookies: {
        jwt: mockCookie,
      },
    } as unknown as Request;

    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ uuid: mockUUID });

    const result = await authService.userUUID(mockRequest);
    expect(result).toBe(mockUUID);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockCookie);
  });

  it('should throw ForbiddenException if jwt cookie is missing', async () => {
    const mockRequest = {
      cookies: {},
    } as Request;

    await expect(authService.userUUID(mockRequest)).rejects.toThrow(
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

    await expect(authService.userUUID(mockRequest)).rejects.toThrow();
  });
});
