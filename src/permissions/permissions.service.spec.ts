import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './models/permission.entity';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let repo: jest.Mocked<Repository<Permission>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
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

    service = module.get<PermissionsService>(PermissionsService);
    repo = module.get(getRepositoryToken(Permission));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find all permissions', async () => {
    const permissions = [{ uuid: '1', name: 'view_users' }];
    repo.find.mockResolvedValue(permissions);

    const result = await service.all();
    expect(result).toEqual(permissions);
    expect(repo.find).toHaveBeenCalledWith({
      where: undefined,
      relations: undefined,
    });
  });

  it('should find one permission by condition', async () => {
    const permission = { uuid: '1', name: 'edit_users' };
    repo.findOne.mockResolvedValue(permission);

    const result = await service.findOne({ uuid: '1' });
    expect(result).toEqual(permission);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { uuid: '1' },
      relations: undefined,
    });
  });

  it('should create/save a permission', async () => {
    const permission = { name: 'create_users' };
    repo.save.mockResolvedValue({ ...permission, uuid: '2' });

    const result = await service.save(permission);
    expect(result).toEqual({ ...permission, uuid: '2' });
    expect(repo.save).toHaveBeenCalledWith(permission);
  });

  it('should update a permission', async () => {
    repo.update.mockResolvedValue({
      affected: 1,
      raw: undefined,
      generatedMaps: [],
    });
    const result = await service.update('1', { name: 'updated_name' });
    expect(result).toEqual({ affected: 1, raw: undefined, generatedMaps: [] });
    expect(repo.update).toHaveBeenCalledWith('1', { name: 'updated_name' });
  });

  it('should delete a permission', async () => {
    repo.delete.mockResolvedValue({ affected: 1, raw: undefined });
    const result = await service.delete('1');
    expect(result).toEqual({ affected: 1, raw: undefined });
    expect(repo.delete).toHaveBeenCalledWith('1');
  });
});
