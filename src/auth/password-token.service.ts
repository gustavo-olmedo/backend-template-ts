import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { PasswordToken } from './models/password-token.entity';
import { addMinutes, isBefore } from 'date-fns';

@Injectable()
export class PasswordTokenService {
  constructor(
    @InjectRepository(PasswordToken)
    private repo: Repository<PasswordToken>,
  ) {}

  private hash(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async issue(
    user: { uuid: string },
    type: 'invite' | 'reset',
    ttlMinutes = 60 * 48,
  ) {
    const plainToken = crypto.randomBytes(32).toString('hex'); // return raw 64 chars
    const tokenHash = this.hash(plainToken);
    const expiresAt = addMinutes(new Date(), ttlMinutes);

    await this.repo.save(
      this.repo.create({
        user: { uuid: user.uuid },
        tokenHash,
        type,
        expiresAt,
        consumedAt: null,
      }),
    );

    return plainToken;
  }

  async verify(raw: string, type: 'invite' | 'reset') {
    const tokenHash = this.hash(raw);
    const rec = await this.repo.findOne({ where: { tokenHash, type } });
    if (!rec) throw new BadRequestException('Invalid or already used link.');
    if (rec.consumedAt)
      throw new BadRequestException('This link was already used.');
    if (isBefore(rec.expiresAt, new Date()))
      throw new BadRequestException('Link expired.');

    return rec;
  }

  async consume(raw: string, type: 'invite' | 'reset') {
    const tokenHash = this.hash(raw);
    await this.repo.update({ tokenHash, type }, { consumedAt: new Date() });
  }

  async revokeAllForUser(userUUID: string, type: 'invite' | 'reset') {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ consumedAt: () => 'NOW()' })
      .where('userUuid = :userUUID AND type = :type AND consumedAt IS NULL', {
        userUUID,
        type,
      })
      .execute();
  }
}
