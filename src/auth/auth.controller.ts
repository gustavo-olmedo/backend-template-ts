import { Body, Controller, Post } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { UsersService } from 'src/users/users.service';

@Controller()
export class AuthController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  async register(@Body() body) {
    const hashedPassword = await bcrypt.hash(body.password, 12);
    return this.usersService.create({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: hashedPassword,
    });
  }
}
