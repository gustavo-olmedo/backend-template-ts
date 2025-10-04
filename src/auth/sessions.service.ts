import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { AbstractService } from 'src/shared/abstract.service';
import { Session } from './models/session.entity';
import { User } from '../users/models/user.entity';

@Injectable()
export class SessionsService extends AbstractService<Session> {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {
    super(sessionRepository);
  }

  async create(
    user: User,
    refreshToken: string,
    ttlDays = 30,
    meta?: { ip?: string; ua?: string },
  ) {
    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      Number(process.env.BCRYPT_COST) || 12,
    );
    const expires = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const session = this.sessionRepository.create({
      user,
      refreshTokenHash,
      expiresAt: expires,
      ip: meta?.ip,
      userAgent: meta?.ua,
    });
    return this.sessionRepository.save(session);
  }

  async revokeById(sessionId: string) {
    await this.sessionRepository.update(
      { id: sessionId },
      { revokedAt: new Date() },
    );
  }

  async isValid(sessionId: string, refreshToken: string) {
    const s = await this.sessionRepository.findOne({
      where: { id: sessionId },
      select: ['id', 'refreshTokenHash', 'expiresAt', 'revokedAt'],
    });
    if (!s || s.revokedAt || s.expiresAt < new Date()) return false;
    return bcrypt.compare(refreshToken, s.refreshTokenHash);
  }
}
