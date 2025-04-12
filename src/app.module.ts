import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

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
  ],
})
export class AppModule {}
