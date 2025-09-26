import { join } from 'path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { PermissionsGuard } from './permissions/permissions.guard';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT!, 10) || 5432,
      password: process.env.POSTGRES_PASSWORD,
      username: process.env.POSTGRES_USER,
      database: process.env.POSTGRES_DATABASE,
      synchronize: true,
      autoLoadEntities: process.env.NODE_ENV !== 'production',
      logging: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60, // 60s window
        limit: 10, // default 10 requests per route per IP
      },
    ]),
    UsersModule,
    AuthModule,
    SharedModule,
    RolesModule,
    PermissionsModule,
    FileStorageModule,
    MailModule.forRoot({
      transport: process.env.MAIL_TRANSPORT!,
      from:
        process.env.MAIL_FROM || 'Your App <gustavo.olmedo.formosa@gmail.com>',
      cache: process.env.NODE_ENV === 'production',
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
