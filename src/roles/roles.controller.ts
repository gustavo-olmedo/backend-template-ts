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
    return this.rolesService.all({ relations: ['permissions'] });
  }

  @HasPermission('roles')
  @Post()
  async create(
    @Body('name') name: string,
    @Body('permissionUUIDs') permissionUUIDs: string[],
  ): Promise<Role> {
    if (!name || !permissionUUIDs || permissionUUIDs.length === 0) {
      throw new BadRequestException();
    }

    return this.rolesService.save({
      name,
      permissions: permissionUUIDs.map((uuid) => ({ uuid })),
    });
  }

  @HasPermission('roles')
  @Get(':uuid')
  async get(@Param('uuid') uuid): Promise<Role | null> {
    return this.rolesService.findOne({ uuid }, ['permissions']);
  }

  @HasPermission('roles')
  @Put(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body('name') name: string,
    @Body('permissionUUIDs') permissionUUIDs: string[],
  ) {
    const role = await this.rolesService.findOne({ uuid }, ['permissions']);

    if (!role) throw new NotFoundException();

    role.name = name;

    if (permissionUUIDs) {
      role.permissions = permissionUUIDs.map(
        (uuid) => ({ uuid }) as Permission,
      );
    }

    return this.rolesService.save(role);
  }

  @HasPermission('roles')
  @Delete(':uuid')
  async delete(@Param('uuid') uuid: string) {
    return this.rolesService.delete(uuid);
  }
}
