import {
  BadRequestException,
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
import { AuthGuard } from '../auth/auth/auth.guard';
import { UserCreateDto } from './dtos/user.create.dto';
import { UserUpdateDto } from './dtos/user.update.dto';
import { AuthService } from '../auth/auth.service';
import { HasPermission } from '../permissions/has-permission.decorator';
import { UserUpdateInfoDto } from './dtos/user.update.info.dto';

@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @HasPermission('users')
  @Get()
  async all(@Query('page') page: number): Promise<{
    data: Partial<User>[];
    meta: { total: number; page: number; lastPage: number };
  }> {
    return this.usersService.paginate(page, ['role']);
  }

  @HasPermission('users')
  @Post()
  async create(@Body() body: UserCreateDto): Promise<User> {
    const password = await bcrypt.hash('1234', 12);
    return this.usersService.save({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password,
      role: { uuid: body.roleUUID },
    });
  }

  @HasPermission('users')
  @Get(':uuid')
  async get(@Param('uuid') uuid): Promise<User | null> {
    return this.usersService.findOne({ uuid }, ['role']);
  }

  @HasPermission('users')
  @Put('info')
  async updateInfo(@Req() request, @Body() body: UserUpdateInfoDto) {
    const uuid = await this.authService.userUUID(request);
    await this.usersService.update(uuid, {
      ...body,
    });
    return this.usersService.findOne({ uuid });
  }

  @HasPermission('users')
  @Put('password')
  async updatePassword(
    @Req() request,
    @Body('password') password: string,
    @Body('passwordConfirm') passwordConfirm: string,
  ) {
    if (password !== passwordConfirm) {
      throw new BadRequestException('Password do not match!');
    }
    const uuid = await this.authService.userUUID(request);
    const hashedPassword = await bcrypt.hash(password, 12);
    await this.usersService.update(uuid, { password: hashedPassword });
    return this.usersService.findOne({ uuid });
  }

  @HasPermission('users')
  @Put(':uuid')
  async update(@Param('uuid') uuid: string, @Body() body: UserUpdateDto) {
    const { roleUUID, ...data } = body;
    await this.usersService.update(uuid, {
      ...data,
      role: { uuid: roleUUID },
    });

    return this.usersService.findOne({ uuid }, ['role']);
  }

  @HasPermission('users')
  @Delete(':uuid')
  async delete(@Param('uuid') uuid: string) {
    return this.usersService.delete(uuid);
  }
}
