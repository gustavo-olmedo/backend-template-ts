import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from './models/role.entity';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}
  @Get()
  async all() {
    return this.rolesService.all();
  }

  @Post()
  async create(
    @Body('name') name: string,
    @Body('permissions') permissionIds: string[],
  ): Promise<Role> {
    return this.rolesService.save({
      name,
      permissions: permissionIds.map((uuid) => ({ uuid })),
    });
  }

  @Get('uuid')
  async get(@Param('uuid') uuid): Promise<Role | null> {
    return this.rolesService.findOne({ uuid }, ['permissions']);
  }

  @Put('uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body('name') name: string,
    @Body('permissions') permissionIds: string[],
  ) {
    await this.rolesService.update(uuid, {
      name,
    });

    const role = await this.rolesService.findOne({ uuid });

    return this.rolesService.update(uuid, {
      ...role,
      permissions: permissionIds.map((uuid) => ({ uuid })),
    });
  }

  @Delete('uuid')
  async delete(@Param('uuid') uuid: string) {
    return this.rolesService.delete(uuid);
  }
}
