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
