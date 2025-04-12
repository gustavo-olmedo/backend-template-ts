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
    @Body('permissions') permissionIds: number[],
  ): Promise<Role> {
    return this.rolesService.create({
      name,
      permissions: permissionIds.map((id) => ({ id })),
    });
  }

  @Get('id')
  async get(@Param('id') id): Promise<Role | null> {
    return this.rolesService.findOne({ id });
  }

  @Put('id')
  async update(
    @Param('id') id: number,
    @Body('name') name: string,
    @Body('permissions') permissionIds: number[],
  ) {
    await this.rolesService.update(id, {
      name,
    });

    const role = await this.rolesService.findOne({ id });

    return this.rolesService.create({
      ...role,
      permissions: permissionIds.map((id) => ({ id })),
    });
  }

  @Delete('id')
  async delete(@Param('id') id: number) {
    return this.rolesService.delete(id);
  }
}
