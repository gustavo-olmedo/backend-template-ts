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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from './models/user.entity';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/auth/auth/auth.guard';
import { UserCreateDto } from './models/user.create.dto';
import { UserUpdateDto } from './models/user.update.dto';

@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async all(@Query('page') page: number): Promise<{
    data: Partial<User>[];
    meta: { total: number; page: number; lastPage: number };
  }> {
    return this.usersService.paginate(page);
  }

  @Post()
  async create(@Body() body: UserCreateDto): Promise<User> {
    const password = await bcrypt.hash('1234', 12);
    return this.usersService.create({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password,
    });
  }

  @Get('id')
  async get(@Param('id') id): Promise<User | null> {
    return this.usersService.findOne({ id });
  }

  @Put('id')
  async update(@Param('id') id: number, @Body() body: UserUpdateDto) {
    await this.usersService.update(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
    });

    return this.usersService.findOne({ id });
  }

  @Delete('id')
  async delete(@Param('id') id: number) {
    return this.usersService.delete(id);
  }
}
