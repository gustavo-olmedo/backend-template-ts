import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from './models/role.entity';
import { RolesService } from './roles.service';
import { HasPermission } from '../permissions/has-permission.decorator';
import { AuthGuard } from '../auth/auth/auth.guard';
import { Permission } from '../permissions/models/permission.entity';

@UseGuards(AuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @HasPermission('roles')
  @Get()
  async all() {
    const roles = await this.rolesService.all({ relations: ['permissions'] });
    return roles
      .filter((r) => r.isActive)
      .map((currentRole) => {
        const { isActive, isSystem, ...role } = currentRole;
        return role;
      });
  }

  @HasPermission('roles')
  @Post()
  async create(
    @Body('name') name: string,
    @Body('permissionIds') permissionIds: string[],
  ): Promise<Role> {
    if (!name || !permissionIds || permissionIds.length === 0) {
      throw new BadRequestException();
    }

    return this.rolesService.save({
      name,
      permissions: permissionIds.map((id) => ({ id })),
    });
  }

  @HasPermission('roles')
  @Get(':id')
  async get(@Param('id') id): Promise<Role | null> {
    return this.rolesService.findOne({ id }, ['permissions']);
  }

  @HasPermission('roles')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    const role = await this.rolesService.findOne({ id }, ['permissions']);

    if (!role) throw new NotFoundException();

    role.name = name;

    if (permissionIds) {
      role.permissions = permissionIds.map((id) => ({ id }) as Permission);
    }

    return this.rolesService.save(role);
  }

  @HasPermission('roles')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    const role = await this.rolesService.findOne({ id });

    if (!role) throw new NotFoundException();

    if (!role.isSystem) {
      role.isActive = false;
    }

    return this.rolesService.save(role);
  }
}
