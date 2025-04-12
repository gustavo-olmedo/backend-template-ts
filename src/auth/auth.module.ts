import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [UsersModule, SharedModule],
  controllers: [AuthController],
})
export class AuthModule {}
