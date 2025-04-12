import { Controller, Post } from '@nestjs/common';

@Controller()
export class AuthController {
  @Post()
  async register() {
    return 'register';
  }
}
