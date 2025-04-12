import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './models/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
  ) {}

  async all(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async create(data): Promise<Role> {
    return this.rolesRepository.save(data);
  }

  async findOne(condition): Promise<Role | null> {
    return this.rolesRepository.findOne({
      where: condition,
      relations: ['permissions'],
    });
  }

  async update(id: number, data): Promise<unknown> {
    return this.rolesRepository.update(id, data);
  }

  async delete(id: number): Promise<unknown> {
    return this.rolesRepository.delete(id);
  }
}
