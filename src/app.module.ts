import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'db',
      port: 5432,
      password: 'postgres',
      username: 'postgres',
      database: 'postgres',
      synchronize: true,
      autoLoadEntities: true,
      logging: true,
    }),
    UsersModule,
    AuthModule,
    SharedModule,
  ],
})
export class AppModule {}
