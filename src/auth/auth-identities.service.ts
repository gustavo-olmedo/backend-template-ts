import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthIdentity } from './models/auth-identity.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/models/user.entity';

@Injectable()
export class AuthIdentitiesService {
  constructor(
    @InjectRepository(AuthIdentity)
    private repo: Repository<AuthIdentity>,
  ) {}

  async upsertPassword(user: User, plainPassword: string) {
    const hash = await bcrypt.hash(plainPassword, 12);
    let identity = await this.repo.findOne({
      where: { user: { uuid: user.uuid }, provider: 'password' },
      withDeleted: false,
    });
    if (!identity) {
      identity = this.repo.create({
        user,
        provider: 'password',
        providerUid: user.email,
        passwordHash: hash,
      });
    } else {
      identity.passwordHash = hash;
    }
    return this.repo.save(identity);
  }

  async comparePassword(user: User, plain: string): Promise<boolean> {
    const identity = await this.repo.findOne({
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
    let identity = await this.repo.findOne({
      where: { user: { uuid: user.uuid }, provider },
    });
    if (!identity) {
      identity = this.repo.create({ user, provider, providerUid });
    } else {
      identity.providerUid = providerUid;
    }
    identity.lastLoginAt = new Date();
    return this.repo.save(identity);
  }
}
