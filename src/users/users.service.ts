import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './models/user.entity';
import { AbstractService } from '../shared/abstract.service';

@Injectable()
export class UsersService extends AbstractService<User> {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {
    super(usersRepository);
  }

  override async paginate(page = 1, relations) {
    const { data, meta } = await super.paginate(page, relations);

    return {
      data: data.map((user: User) => {
        const { password, ...userWithoutPass } = user;
        return userWithoutPass;
      }),
      meta,
    };
  }

  async updateAvatar(uuid: string, params: { url: string; publicId: string }) {
    const user = await this.repository.findOne({ where: { uuid } });
    if (!user) throw new NotFoundException('User not found');
    user.avatarUrl = params.url;
    user.avatarPublicId = params.publicId;
    return this.repository.save(user);
  }
}
