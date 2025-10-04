import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private usersService: UsersService,
    private rolesService: RolesService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const access = this.reflector.get('access', context.getHandler());
    if (!access) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const id = await this.authService.getUserId(request);

    const user = await this.usersService.findOne({ id }, ['role']);
    if (!user) return false;

    const role = await this.rolesService.findOne({ id: user.role.id }, [
      'permissions',
    ]);
    if (!role) return false;

    if (request.method === 'GET') {
      return role.permissions.some(
        (p) => p.name === `view_${access}` || p.name === `edit_${access}`,
      );
    }
    return role.permissions.some((p) => p.name === `edit_${access}`);
  }
}
