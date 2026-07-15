import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { AbstractService } from './abstract.service';
import { Injectable } from '@nestjs/common';

class DummyEntity {
  id: string;
  name: string;
}

@Injectable()
class DummyService extends AbstractService<DummyEntity> {
  constructor(protected readonly repository: Repository<DummyEntity>) {
    super(repository);
  }
}

describe('AbstractService', () => {
  let service: DummyService;
  let repo: jest.Mocked<Repository<DummyEntity>>;

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DummyService,
        {
          provide: Repository,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get(DummyService);
    repo = module.get(Repository);
  });

  it('should find all entities', async () => {
    const entities = [{ id: '1', name: 'Test' }];
    repo.find.mockResolvedValue(entities);

    const result = await service.all();
    expect(result).toEqual(entities);
    expect(repo.find).toHaveBeenCalledWith({
      where: undefined,
      relations: undefined,
    });
  });

  it('should paginate correctly', async () => {
    const entities = [{ id: '1', name: 'Paged' }];
    repo.findAndCount.mockResolvedValue([entities, 1]);

    const result = await service.paginate(1);
    expect(result.data).toEqual(entities);
    expect(result.meta).toEqual({ total: 1, page: 1, lastPage: 1 });
    expect(repo.findAndCount).toHaveBeenCalledWith({
      take: 7,
      skip: 0,
      relations: undefined,
    });
  });

  it('should save data', async () => {
    const newData = { id: 'some-id', name: 'Save Test' };
    repo.save.mockResolvedValue(newData);

    const result = await service.save(newData);
    expect(result).toEqual(newData);
    expect(repo.save).toHaveBeenCalledWith(newData);
  });

  it('should find one entity', async () => {
    const entity = { id: '1', name: 'FindMe' };
    repo.findOne.mockResolvedValue(entity);

    const result = await service.findOne({ id: '1' });
    expect(result).toEqual(entity);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: '1' },
      relations: undefined,
    });
  });

  it('should update an entity', async () => {
    const updateResult = { affected: 1, raw: undefined, generatedMaps: [] };
    repo.update.mockResolvedValue(updateResult);

    const result = await service.update('1', { name: 'Updated' });
    expect(result).toEqual(updateResult);
    expect(repo.update).toHaveBeenCalledWith('1', { name: 'Updated' });
  });

  it('should delete an entity', async () => {
    const deleteResult = { affected: 1, raw: null };
    repo.delete.mockResolvedValue(deleteResult);

    const result = await service.delete('1');
    expect(result).toEqual(deleteResult);
    expect(repo.delete).toHaveBeenCalledWith('1');
  });
});
