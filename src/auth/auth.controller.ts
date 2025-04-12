import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Controller()
export class AuthController {
  constructor(private usersService: UsersService) {}

  @Post()
  async register(@Body() body) {
    return this.usersService.create(body);
  }
}
