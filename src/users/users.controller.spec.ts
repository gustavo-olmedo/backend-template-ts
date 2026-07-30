import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { UserCreateDto } from './dtos/user-create.dto';
import { UserUpdateDto } from './dtos/user-update.dto';
import { SharedModule } from '../shared/shared.module';
import { UserUpdateInfoDto } from './dtos/user-update-info.dto';
import { FILE_STORAGE } from '../file-storage/file-storage.module';
import { PasswordTokenService } from '../auth/password-token.service';
import { MailService } from '../mail/mail.service';
import { AuthIdentitiesService } from '../auth/auth-identities.service';
import { AuthGuard } from '../auth/auth/auth.guard';

const mockUsersService = {
  paginate: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAuthService = {
  getUserId: jest.fn(),
};

const mockPasswordTokenService = { issue: jest.fn() };
const mockMailService = { sendInvite: jest.fn() };
const mockAuthIdentitiesService = { upsertPassword: jest.fn() };

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: FILE_STORAGE, useValue: {} },
        {
          provide: PasswordTokenService,
          useValue: mockPasswordTokenService,
        },
        { provide: MailService, useValue: mockMailService },
        {
          provide: AuthIdentitiesService,
          useValue: mockAuthIdentitiesService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should fetch paginated users', async () => {
    mockUsersService.paginate.mockResolvedValue({ data: [], meta: {} });
    const result = await controller.all(1);
    expect(result).toEqual({ data: [], meta: {} });
    expect(mockUsersService.paginate).toHaveBeenCalledWith(1, ['role']);
  });

  it('should create a user and send an invitation', async () => {
    const dto: UserCreateDto = {
      firstName: 'Gustavo',
      lastName: 'Olmedo',
      email: 'golmedo@mail.com',
      roleId: 'role-id',
    };

    mockUsersService.save.mockResolvedValue({ id: 'user-id', ...dto });
    mockPasswordTokenService.issue.mockResolvedValue('invite-token');

    const result = await controller.create(dto);

    expect(mockUsersService.save).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        role: { id: dto.roleId },
      }),
    );
    expect(mockPasswordTokenService.issue).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-id' }),
      'invite',
    );
    expect(mockMailService.sendInvite).toHaveBeenCalled();
    expect(result.id).toEqual('user-id');
  });

  it('should get a user by id', async () => {
    mockUsersService.findOne.mockResolvedValue({ id: 'some-id' });
    const result = await controller.get('some-id');
    expect(result).toEqual({ id: 'some-id' });
    expect(mockUsersService.findOne).toHaveBeenCalledWith({ id: 'some-id' }, [
      'role',
    ]);
  });

  it('should update user info for logged-in user', async () => {
    const request = {};
    const dto: UserUpdateInfoDto = {
      firstName: 'Gustavo',
      lastName: 'Updated',
      email: 'updated@mail.com',
    };

    mockAuthService.getUserId.mockResolvedValue('user-id');
    mockUsersService.update.mockResolvedValue(undefined);
    mockUsersService.findOne.mockResolvedValue({ id: 'user-id', ...dto });

    const result = await controller.updateInfo(request, dto);
    expect(result).toEqual({ id: 'user-id', ...dto });
  });

  it('should throw if passwords do not match', async () => {
    await expect(
      controller.updatePassword({}, 'pass123', 'mismatch'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update password if match', async () => {
    const id = 'user-id';
    const user = { id };
    mockAuthService.getUserId.mockResolvedValue(id);
    mockUsersService.findOne.mockResolvedValue(user);

    const result = await controller.updatePassword({}, 'pass123', 'pass123');

    expect(mockAuthIdentitiesService.upsertPassword).toHaveBeenCalledWith(
      user,
      'pass123',
    );
    expect(result).toEqual(user);
  });

  it('should update a user by id', async () => {
    const dto: UserUpdateDto = {
      firstName: 'New',
      lastName: 'Name',
      email: 'new@mail.com',
      roleId: 'role-123',
    };
    mockUsersService.update.mockResolvedValue(undefined);
    mockUsersService.findOne.mockResolvedValue({ id: 'some-id', ...dto });

    const result = await controller.update('some-id', dto);

    expect(result).toEqual({ id: 'some-id', ...dto });
    expect(mockUsersService.update).toHaveBeenCalledWith(
      'some-id',
      expect.any(Object),
    );
  });

  it('should delete a user by id', async () => {
    mockUsersService.delete.mockResolvedValue({ deleted: true });
    const result = await controller.delete('user-id');
    expect(result).toEqual({ deleted: true });
    expect(mockUsersService.delete).toHaveBeenCalledWith('user-id');
  });
});
