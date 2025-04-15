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

  it('should paginate and exclude passwords', async () => {
    const users: User[] = [
      {
        uuid: '1',
        email: 'test@example.com',
        password: 'secret',
        firstName: 'gustavo',
        lastName: 'olmedo',
        role: {
          uuid: '1',
          name: 'test',
          permissions: [],
        },
      },
      {
        uuid: '2',
        email: 'john@example.com',
        password: '1234',
        firstName: 'adolfo',
        lastName: 'mendoza',
        role: {
          uuid: '1',
          name: 'test',
          permissions: [],
        },
      },
    ];
    const total = 2;

    repo.findAndCount.mockResolvedValue([users, total]);

    const result = await service.paginate(1, []);

    expect(result.meta.total).toBe(2);
    expect(result.data.length).toBe(2);
    result.data.forEach((user) => {
      expect(user).not.toHaveProperty('password');
    });
    expect(repo.findAndCount).toHaveBeenCalledWith({
      take: 15,
      skip: 0,
      relations: [],
    });
  });
});
