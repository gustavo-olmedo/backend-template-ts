import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device } from './models/device.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    AuthModule,
    UsersModule,
    SharedModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
