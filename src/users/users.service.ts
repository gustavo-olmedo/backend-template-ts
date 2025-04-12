import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './models/user.entity';
import { AbstractService } from 'src/shared/abstract.service';

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
}
