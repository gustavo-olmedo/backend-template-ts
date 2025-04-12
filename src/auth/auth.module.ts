import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { SharedModule } from 'src/shared/shared.module';
import { AuthService } from './auth.service';
import { RolesModule } from 'src/roles/roles.module';

@Module({
  imports: [forwardRef(() => UsersModule), SharedModule, RolesModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
