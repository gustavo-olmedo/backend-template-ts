import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from './auth.service';
import { RolesModule } from '../roles/roles.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordToken } from './models/password-token.entity';
import { PasswordTokenService } from './password-token.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([PasswordToken]),
    SharedModule,
    RolesModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordTokenService],
  exports: [AuthService, PasswordTokenService],
})
export class AuthModule {}
