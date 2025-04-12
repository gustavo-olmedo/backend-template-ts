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
  async create(@Body('name') name: string): Promise<Role> {
    return this.rolesService.create({
      name,
    });
  }

  @Get('id')
  async get(@Param('id') id): Promise<Role | null> {
    return this.rolesService.findOne({ id });
  }

  @Put('id')
  async update(@Param('id') id: number, @Body('name') name: string) {
    await this.rolesService.update(id, {
      name,
    });

    return this.rolesService.findOne({ id });
  }

  @Delete('id')
  async delete(@Param('id') id: number) {
    return this.rolesService.delete(id);
  }
}
