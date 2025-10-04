import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth/auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dtos/register-device.dto';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';

@UseGuards(AuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devices: DevicesService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Req() req, @Body() body: RegisterDeviceDto) {
    const userUUID = await this.authService.userUUID(req);
    const user = await this.usersService.findOne({ uuid: userUUID });
    if (!user) throw new BadRequestException('User not found.');

    const device = await this.devices.upsertByInstance(
      user,
      body.appInstanceId,
      {
        platform: body.platform,
        pushToken: body.pushToken,
        locale: body.locale,
        timezone: body.timezone,
        model: body.model,
        osVersion: body.osVersion,
        appVersion: body.appVersion,
      },
    );
    return { id: device.id };
  }
}
