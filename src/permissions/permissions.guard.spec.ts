import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { Role } from '../roles/models/role.entity';
import { RolesService } from '../roles/roles.service';
import { User } from '../users/models/user.entity';
import { UsersService } from '../users/users.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'get'>>;
  let authService: jest.Mocked<Pick<AuthService, 'getUserId'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findOne'>>;
  let rolesService: jest.Mocked<Pick<RolesService, 'findOne'>>;

  const role = (permissions: Role['permissions'] = []): Role => ({
    id: 'role-id',
    name: 'role-name',
    isActive: true,
    isSystem: false,
    permissions,
  });

  const user = (): User => ({
    id: 'user-id',
    email: 'test@example.com',
    firstName: 'Gustavo',
    lastName: 'Olmedo',
    identities: [],
    role: role(),
  });

  const context = (method = 'GET'): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ method }) }),
      getHandler: () => ({}),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    authService = { getUserId: jest.fn() };
    usersService = { findOne: jest.fn() };
    rolesService = { findOne: jest.fn() };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      authService as unknown as AuthService,
      usersService as unknown as UsersService,
      rolesService as unknown as RolesService,
    );
  });

  it('allows routes without access metadata', async () => {
    reflector.get.mockReturnValue(undefined);

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(authService.getUserId).not.toHaveBeenCalled();
  });

  it('denies access when the user is not found', async () => {
    reflector.get.mockReturnValue('users');
    authService.getUserId.mockResolvedValue('user-id');
    usersService.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(context())).resolves.toBe(false);
  });

  it('denies access when the role is not found', async () => {
    reflector.get.mockReturnValue('users');
    authService.getUserId.mockResolvedValue('user-id');
    usersService.findOne.mockResolvedValue(user());
    rolesService.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(context())).resolves.toBe(false);
  });

  it.each(['view_users', 'edit_users'])(
    'allows GET with %s permission',
    async (permissionName) => {
      reflector.get.mockReturnValue('users');
      authService.getUserId.mockResolvedValue('user-id');
      usersService.findOne.mockResolvedValue(user());
      rolesService.findOne.mockResolvedValue(
        role([{ id: 'permission-id', name: permissionName }]),
      );

      await expect(guard.canActivate(context('GET'))).resolves.toBe(true);
    },
  );

  it('allows writes only with edit permission', async () => {
    reflector.get.mockReturnValue('users');
    authService.getUserId.mockResolvedValue('user-id');
    usersService.findOne.mockResolvedValue(user());
    rolesService.findOne.mockResolvedValue(
      role([{ id: 'permission-id', name: 'edit_users' }]),
    );

    await expect(guard.canActivate(context('POST'))).resolves.toBe(true);
  });

  it('denies access without a matching permission', async () => {
    reflector.get.mockReturnValue('users');
    authService.getUserId.mockResolvedValue('user-id');
    usersService.findOne.mockResolvedValue(user());
    rolesService.findOne.mockResolvedValue(role());

    await expect(guard.canActivate(context('DELETE'))).resolves.toBe(false);
  });
});
