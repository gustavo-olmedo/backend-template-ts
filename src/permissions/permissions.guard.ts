import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from 'src/auth/auth.service';
import { Role } from 'src/roles/models/role.entity';
import { RolesService } from 'src/roles/roles.service';
import { UsersService } from 'src/users/users.service';

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
    const id = await this.authService.userUUID(request);

    const user = await this.usersService.findOne({ id }, ['role']);
    if (!user) return false;

    const role = await this.rolesService.findOne({ uuid: user.role.uuid }, [
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
