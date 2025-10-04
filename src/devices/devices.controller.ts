import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth/auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dtos/register-device.dto';
import { AuthService } from 'src/auth/auth.service';
import { UsersService } from 'src/users/users.service';
import { HeartbeatDto } from './dtos/heartbeat.dto';
import { UpdateTokenDto } from './dtos/update-token.dto';

@UseGuards(AuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Req() req, @Body() body: RegisterDeviceDto) {
    const userUUID = await this.authService.userUUID(req);
    const user = await this.usersService.findOne({ uuid: userUUID });
    if (!user) throw new BadRequestException('User not found.');

    const device = await this.devicesService.upsertByInstance(
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

  @Post('heartbeat') // App foreground/resume events (mobile), or periodically (e.g. every 24h) while the app is active. Web: on page load or visibility change (optional)
  async heartbeat(@Req() req, @Body() body: HeartbeatDto) {
    const userUUID = await this.authService.userUUID(req);
    const user = await this.usersService.findOne({ uuid: userUUID });
    if (!user) throw new BadRequestException('User not found.');

    await this.devicesService.heartbeat(user, body.appInstanceId);

    return { ok: true };
  }

  @Patch(':id/token')
  async updateToken(
    @Req() req,
    @Param('id') id: string,
    @Body() body: UpdateTokenDto,
  ) {
    const userUUID = await this.authService.userUUID(req);
    const user = await this.usersService.findOne({ uuid: userUUID });
    if (!user) throw new BadRequestException('User not found.');
    await this.devicesService.updateToken(user, id, body.pushToken ?? null);
    return { ok: true };
  }

  @Get()
  async list(@Req() req) {
    const userUUID = await this.authService.userUUID(req);
    const user = await this.usersService.findOne({ uuid: userUUID });
    if (!user) throw new BadRequestException('User not found.');
    return this.devicesService.listForUser(user);
  }

  @Delete(':id')
  async revoke(@Req() req, @Param('id') id: string) {
    const userUUID = await this.authService.userUUID(req);
    const user = await this.usersService.findOne({ uuid: userUUID });
    if (!user) throw new BadRequestException('User not found.');
    await this.devicesService.revoke(user, id);
    // Optionally also revoke sessions tied to this device inside the service.
    return { ok: true };
  }
}
