import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './models/role.entity';
import { AbstractService } from '../shared/abstract.service';

@Injectable()
export class RolesService extends AbstractService<Role> {
  constructor(
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
  ) {
    super(rolesRepository);
  }
}
