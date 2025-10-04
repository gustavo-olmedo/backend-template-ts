import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { Role } from './models/role.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { permission } from 'process';

describe('RolesService', () => {
  let service: RolesService;
  let repo: jest.Mocked<Repository<Role>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    repo = module.get(getRepositoryToken(Role));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find all roles', async () => {
    const roles = [{ id: '1', name: 'Admin', permissions: [] }];
    repo.find.mockResolvedValue(roles);

    const result = await service.all();
    expect(result).toEqual(roles);
    expect(repo.find).toHaveBeenCalledWith({
      where: undefined,
      relations: undefined,
    });
  });

  it('should find one role by condition', async () => {
    const role = { id: '1', name: 'User', permissions: [] };
    repo.findOne.mockResolvedValue(role);

    const result = await service.findOne({ id: '1' });
    expect(result).toEqual(role);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: '1' },
      relations: undefined,
    });
  });

  it('should create/save a role', async () => {
    const role = { name: 'Editor' };
    repo.save.mockResolvedValue({ ...role, id: '2', permissions: [] });

    const result = await service.save(role);
    expect(result).toEqual({ ...role, id: '2', permissions: [] });
    expect(repo.save).toHaveBeenCalledWith(role);
  });

  it('should update a role', async () => {
    repo.update.mockResolvedValue({
      affected: 1,
      raw: undefined,
      generatedMaps: [],
    });
    const result = await service.update('1', { name: 'Updated' });
    expect(result).toEqual({ affected: 1, raw: undefined, generatedMaps: [] });
    expect(repo.update).toHaveBeenCalledWith('1', { name: 'Updated' });
  });

  it('should delete a role', async () => {
    repo.delete.mockResolvedValue({ affected: 1, raw: undefined });
    const result = await service.delete('1');
    expect(result).toEqual({ affected: 1, raw: undefined });
    expect(repo.delete).toHaveBeenCalledWith('1');
  });
});
