import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from './models/user.entity';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/auth/auth/auth.guard';
import { UserCreateDto } from './models/user.create.dto';
import { UserUpdateDto } from './models/user.update.dto';
import { AuthService } from 'src/auth/auth.service';

@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Get()
  async all(@Query('page') page: number): Promise<{
    data: Partial<User>[];
    meta: { total: number; page: number; lastPage: number };
  }> {
    return this.usersService.paginate(page, ['role']);
  }

  @Post()
  async create(@Body() body: UserCreateDto): Promise<User> {
    const password = await bcrypt.hash('1234', 12);
    return this.usersService.save({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password,
      role: { id: body.roleId },
    });
  }

  @Get('id')
  async get(@Param('id') id): Promise<User | null> {
    return this.usersService.findOne({ id }, ['role']);
  }

  @Put('id')
  async update(@Param('id') id: number, @Body() body: UserUpdateDto) {
    const { roleId, ...data } = body;
    await this.usersService.update(id, {
      ...data,
      role: { id: roleId },
    });

    return this.usersService.findOne({ id }, ['role']);
  }

  @Delete('id')
  async delete(@Param('id') id: number) {
    return this.usersService.delete(id);
  }

  @Put('info')
  async updateInfo(@Req() request, @Body() body: UserUpdateDto) {
    const id = await this.authService.userId(request);
    await this.usersService.update(id, body);
    return this.usersService.findOne({ id });
  }
}
