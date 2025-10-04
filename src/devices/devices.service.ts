import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Device, DevicePlatform, PushProvider } from './models/devices.entity';
import { User } from '../users/models/user.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
  ) {}

  async upsertByInstance(
    user: User,
    appInstanceId: string,
    payload: {
      platform: DevicePlatform;
      pushProvider?: PushProvider;
      pushToken?: string | null;
      webpush?: { endpoint: string; p256dh: string; auth: string } | null;
      locale?: string;
      timezone?: string;
      model?: string;
      osVersion?: string;
      appVersion?: string;
    },
  ): Promise<Device> {
    let device = await this.devicesRepository.findOne({
      where: { user: { uuid: user.uuid }, appInstanceId },
    });
    const now = new Date();
    if (!device) {
      device = this.devicesRepository.create({
        user,
        appInstanceId,
        ...payload,
        lastSeenAt: now,
      });
    } else {
      Object.assign(device, payload, { lastSeenAt: now, revokedAt: null });
    }
    if (payload.webpush) {
      device.pushProvider = 'webpush';
      device.webpushEndpoint = payload.webpush.endpoint;
      device.webpushP256dh = payload.webpush.p256dh;
      device.webpushAuth = payload.webpush.auth;
    }
    return this.devicesRepository.save(device);
  }

  async heartbeat(user: User, appInstanceId: string) {
    await this.devicesRepository.update(
      { appInstanceId, user: { uuid: user.uuid } },
      { lastSeenAt: new Date() },
    );
  }

  async revoke(user: User, id: string) {
    await this.devicesRepository.update(
      { id, user: { uuid: user.uuid } },
      { revokeAt: new Date() },
    );
  }
}
