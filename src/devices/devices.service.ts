import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Device, DevicePlatform, PushProvider } from './models/device.entity';
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
      where: { user: { id: user.id }, appInstanceId },
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
      { appInstanceId, user: { id: user.id } },
      { lastSeenAt: new Date() },
    );
  }

  /**
   * checks ownership (device belongs to the user)
   * blocks updates if the device was revoked
   * updates pushToken and bumps lastSeenAt
   */
  async updateToken(
    user: Pick<User, 'id'>,
    deviceId: string,
    token: string | null,
  ): Promise<void> {
    // Ensure device exists and belongs to this user
    const device = await this.devicesRepository.findOne({
      where: { id: deviceId, user: { id: user.id } },
      // Select fields you need to check; include revokedAt if your schema has it
      select: [
        'id',
        'pushToken',
        'lastSeenAt',
        'revokedAt',
      ] as (keyof Device)[],
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // If track revocation, block updates to revoked devices
    if (typeof device.revokedAt !== 'undefined' && device.revokedAt) {
      throw new BadRequestException('Device is revoked');
    }

    device.pushToken = token; // can be null to clear
    device.lastSeenAt = new Date();

    await this.devicesRepository.save(device);
  }

  /**
   * List devices for a user.
   * - Excludes revoked devices by default.
   * - Ordered by lastSeenAt (desc) then createdAt (desc).
   * - Supports simple pagination.
   */
  async listForUser(
    user: Pick<User, 'id'>,
    opts: { includeRevoked?: boolean; limit?: number; offset?: number } = {},
  ): Promise<Device[]> {
    const { includeRevoked = false, limit = 50, offset = 0 } = opts;

    return this.devicesRepository.find({
      where: {
        user: { id: user.id },
        ...(includeRevoked ? {} : { revokedAt: IsNull() }),
      },
      order: { lastSeenAt: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async revoke(user: User, id: string) {
    await this.devicesRepository.update(
      { id, user: { id: user.id } },
      { revokedAt: new Date() },
    );
  }
}
