import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from './models/role.entity';
import { RolesService } from './roles.service';
import { HasPermission } from '../permissions/has-permission.decorator';
import { AuthGuard } from '../auth/auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @HasPermission('roles')
  @Get()
  async all() {
    return this.rolesService.all();
  }

  @HasPermission('roles')
  @Post()
  async create(
    @Body('name') name: string,
    @Body('permissions') permissionUUIDs: string[],
  ): Promise<Role> {
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
    @Body('permissions') permissionUUIDs: string[],
  ) {
    await this.rolesService.update(uuid, {
      name,
    });

    const role = await this.rolesService.findOne({ uuid }, ['permissions']);

    if (permissionUUIDs) {
      return this.rolesService.update(uuid, {
        ...role,
        permissions: permissionUUIDs.map((uuid) => ({ uuid })),
      });
    } else {
      return role;
    }
  }

  @HasPermission('roles')
  @Delete(':uuid')
  async delete(@Param('uuid') uuid: string) {
    return this.rolesService.delete(uuid);
  }
}
