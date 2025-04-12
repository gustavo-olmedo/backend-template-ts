import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './models/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async all(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async paginate(page = 1) {
    const take = 15;
    const [users, total] = await this.usersRepository.findAndCount({
      take,
      skip: (page - 1) * take,
    });
    return {
      data: users.map((user: User) => {
        const { password, ...userWithoutPass } = user;
        return userWithoutPass;
      }),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / take),
      },
    };
  }

  async create(data): Promise<User> {
    return this.usersRepository.save(data);
  }

  async findOne(condition, relations?: string[]): Promise<User | null> {
    return this.usersRepository.findOne({
      where: condition,
      relations,
    });
  }

  async update(id: number, data): Promise<unknown> {
    return this.usersRepository.update(id, data);
  }

  async delete(id: number): Promise<unknown> {
    return this.usersRepository.delete(id);
  }
}
