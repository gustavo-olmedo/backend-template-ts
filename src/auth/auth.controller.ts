import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Response, Request } from 'express';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth.service';
import { RolesService } from '../roles/roles.service';

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class AuthController {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private authService: AuthService,
    private rolesService: RolesService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    if (body.password !== body.passwordConfirm) {
      throw new BadRequestException('Password do not match!');
    }
    const regularRole = await this.rolesService.findOne({ name: 'regular' });
    const hashedPassword = await bcrypt.hash(body.password, 12);
    return this.usersService.save({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: hashedPassword,
      role: { uuid: regularRole?.uuid }, // regular role uuid
    });
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.usersService.findOne({
      email,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Invalid credentials');
    }

    const jwt = await this.jwtService.signAsync({
      uuid: user.uuid,
    });

    response.cookie('jwt', jwt, { httpOnly: true });

    return user;
  }

  @UseGuards(AuthGuard)
  @Get('user')
  async user(@Req() request: Request) {
    const uuid = await this.authService.userUUID(request);
    return this.usersService.findOne({ uuid });
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('jwt');
    return {
      message: 'Success',
    };
  }
}
