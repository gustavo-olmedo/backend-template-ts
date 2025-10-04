import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { RolesService } from '../../roles/roles.service';
import { PermissionsGuard } from '../../permissions/permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;
  let rolesService: jest.Mocked<RolesService>;

  const mockContext = (
    method: string = 'GET',
    access?: string,
  ): ExecutionContext => {
    const req: any = { method, cookies: { jwt: 'token' } };
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
    } as any;
  };

  beforeEach(() => {
    reflector = { get: jest.fn() } as any;
    authService = { userId: jest.fn() } as any;
    usersService = { findOne: jest.fn() } as any;
    rolesService = { findOne: jest.fn() } as any;

    guard = new PermissionsGuard(
      reflector,
      authService,
      usersService,
      rolesService,
    );
  });

  it('should allow access if no access metadata is defined', async () => {
    reflector.get.mockReturnValue(undefined);
    const result = await guard.canActivate(mockContext());
    expect(result).toBe(true);
  });

  it('should deny access if user not found', async () => {
    reflector.get.mockReturnValue('users');
    authService.userId.mockResolvedValue('id');
    usersService.findOne.mockResolvedValue(null);

    const result = await guard.canActivate(mockContext());
    expect(result).toBe(false);
  });

  it('should deny access if role not found', async () => {
    reflector.get.mockReturnValue('users');
    authService.userId.mockResolvedValue('id');
    usersService.findOne.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: 'secret',
      firstName: 'gustavo',
      lastName: 'olmedo',
      role: {
        id: 'role-id',
        name: 'role-name',
        permissions: [],
      },
    });
    rolesService.findOne.mockResolvedValue(null);

    const result = await guard.canActivate(mockContext());
    expect(result).toBe(false);
  });

  it('should allow access for GET if role has view or edit permission', async () => {
    reflector.get.mockReturnValue('users');
    authService.userId.mockResolvedValue('id');
    usersService.findOne.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: 'secret',
      firstName: 'gustavo',
      lastName: 'olmedo',
      role: {
        id: 'role-id',
        name: 'role-name',
        permissions: [],
      },
    });
    rolesService.findOne.mockResolvedValue({
      id: 'role-id',
      name: 'role-name',
      permissions: [{ id: 'permission-id', name: 'view_users' }],
    });

    const result = await guard.canActivate(mockContext('GET'));
    expect(result).toBe(true);
  });

  it('should allow access for non-GET if role has edit permission', async () => {
    reflector.get.mockReturnValue('users');
    authService.userId.mockResolvedValue('id');
    usersService.findOne.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: 'secret',
      firstName: 'gustavo',
      lastName: 'olmedo',
      role: {
        id: 'role-id',
        name: 'role-name',
        permissions: [],
      },
    });
    rolesService.findOne.mockResolvedValue({
      id: 'role-id',
      name: 'role-name',
      permissions: [{ id: 'permission-id', name: 'edit_users' }],
    });

    const result = await guard.canActivate(mockContext('POST'));
    expect(result).toBe(true);
  });

  it('should deny access if role has no matching permissions', async () => {
    reflector.get.mockReturnValue('users');
    authService.userId.mockResolvedValue('id');
    usersService.findOne.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: 'secret',
      firstName: 'gustavo',
      lastName: 'olmedo',
      role: {
        id: 'role-id',
        name: 'role-name',
        permissions: [],
      },
    });
    rolesService.findOne.mockResolvedValue({
      id: 'role-id',
      name: 'role-name',
      permissions: [],
    });

    const result = await guard.canActivate(mockContext('DELETE'));
    expect(result).toBe(false);
  });
});
