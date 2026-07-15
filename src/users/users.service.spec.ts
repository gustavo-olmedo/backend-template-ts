import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './models/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  it('should paginate users', async () => {
    const users: User[] = [
      {
        id: '1',
        email: 'test@example.com',
        firstName: 'gustavo',
        lastName: 'olmedo',
        identities: [],
        role: {
          id: '1',
          name: 'test',
          isActive: true,
          isSystem: false,
          permissions: [],
        },
      },
      {
        id: '2',
        email: 'john@example.com',
        firstName: 'adolfo',
        lastName: 'mendoza',
        identities: [],
        role: {
          id: '1',
          name: 'test',
          isActive: true,
          isSystem: false,
          permissions: [],
        },
      },
    ];
    const total = 2;

    repo.findAndCount.mockResolvedValue([users, total]);

    const result = await service.paginate(1, []);

    expect(result.meta.total).toBe(2);
    expect(result.data.length).toBe(2);
    expect(repo.findAndCount).toHaveBeenCalledWith({
      take: 7,
      skip: 0,
      relations: [],
    });
  });
});
