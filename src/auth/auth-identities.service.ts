import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthIdentity, AuthProvider } from './models/auth-identity.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/models/user.entity';

@Injectable()
export class AuthIdentitiesService {
  constructor(
    @InjectRepository(AuthIdentity)
    private authIdentitiesRepository: Repository<AuthIdentity>,
  ) {}

  async upsertPassword(user: User, plainPassword: string) {
    const hash = await bcrypt.hash(
      plainPassword,
      Number(process.env.BCRYPT_COST) || 12,
    );
    let identity = await this.authIdentitiesRepository.findOne({
      where: { user: { uuid: user.uuid }, provider: 'password' },
      withDeleted: false,
    });
    if (!identity) {
      identity = this.authIdentitiesRepository.create({
        user,
        provider: 'password',
        providerUid: user.email,
        passwordHash: hash,
      });
    } else {
      identity.passwordHash = hash;
    }
    return this.authIdentitiesRepository.save(identity);
  }

  async comparePassword(user: User, plain: string): Promise<boolean> {
    const identity = await this.authIdentitiesRepository.findOne({
      where: { user: { uuid: user.uuid }, provider: 'password' },
      select: ['id', 'passwordHash', 'provider', 'providerUid'],
    });
    if (!identity?.passwordHash) return false;
    return bcrypt.compare(plain, identity.passwordHash);
  }

  async upsertSso(
    user: User,
    provider: 'google' | 'apple' | 'github',
    providerUid: string,
  ) {
    let identity = await this.authIdentitiesRepository.findOne({
      where: { user: { uuid: user.uuid }, provider },
    });
    if (!identity) {
      identity = this.authIdentitiesRepository.create({
        user,
        provider,
        providerUid,
      });
    } else {
      identity.providerUid = providerUid;
    }
    identity.lastLoginAt = new Date();
    return this.authIdentitiesRepository.save(identity);
  }

  /** Update lastLoginAt, backfill identity if missing, and optionally rehash. */
  async touchPasswordLogin(user: User, plainPassword: string) {
    let currentAuthIdentity = await this.authIdentitiesRepository.findOne({
      where: { user: { uuid: user.uuid }, provider: 'password' },
      select: ['id', 'passwordHash', 'providerUid'], // need hash to decide rehash
    });

    const now = new Date();

    if (!currentAuthIdentity) {
      // Backfill identity for legacy users
      const hash = await bcrypt.hash(
        plainPassword,
        Number(process.env.BCRYPT_COST) || 12,
      );
      currentAuthIdentity = this.authIdentitiesRepository.create({
        user,
        provider: 'password',
        providerUid: user.email, // keep provider uid in sync with email
        passwordHash: hash,
        lastLoginAt: now,
      });
      return this.authIdentitiesRepository.save(currentAuthIdentity);
    }

    // Optionally upgrade hash if cost increased
    const needsRehash =
      (!!currentAuthIdentity.passwordHash &&
        bcrypt.getRounds(currentAuthIdentity.passwordHash) <
          Number(process.env.BCRYPT_COST)) ||
      12;

    if (needsRehash) {
      currentAuthIdentity.passwordHash = await bcrypt.hash(
        plainPassword,
        Number(process.env.BCRYPT_COST) || 12,
      );
    }

    // Keep providerUid aligned with current email (if your app allows email change)
    if (currentAuthIdentity.providerUid !== user.email) {
      currentAuthIdentity.providerUid = user.email;
    }

    currentAuthIdentity.lastLoginAt = now;
    return this.authIdentitiesRepository.save(currentAuthIdentity);
  }

  /** Generic: mark last login for any provider (SSO already does this in your upsertSso). */
  async markLogin(user: User, provider: AuthProvider) {
    const id = await this.authIdentitiesRepository.findOne({
      where: { user: { uuid: user.uuid }, provider },
      select: ['id'],
    });
    if (!id) return; // for SSO, upsertSso already creates it
    await this.authIdentitiesRepository.update(id.id, {
      lastLoginAt: new Date(),
    });
  }
}
