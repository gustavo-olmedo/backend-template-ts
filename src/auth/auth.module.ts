import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from './auth.service';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [forwardRef(() => UsersModule), SharedModule, RolesModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
