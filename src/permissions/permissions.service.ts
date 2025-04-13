import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './models/permission.entity';
import { AbstractService } from '../shared/abstract.service';

@Injectable()
export class PermissionsService extends AbstractService<Permission> {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {
    super(permissionsRepository);
  }
}
