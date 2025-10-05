import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { SharedModule } from '../shared/shared.module';
import { AuthService } from './auth.service';
import { RolesModule } from '../roles/roles.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordToken } from './models/password-token.entity';
import { PasswordTokenService } from './password-token.service';
import { AuthIdentity } from './models/auth-identity.entity';
import { Session } from './models/session.entity';
import { AuthIdentitiesService } from './auth-identities.service';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([PasswordToken, AuthIdentity, Session]),
    SharedModule,
    RolesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordTokenService,
    AuthIdentitiesService,
    SessionsService,
  ],
  exports: [AuthService, PasswordTokenService, AuthIdentitiesService],
})
export class AuthModule {}
