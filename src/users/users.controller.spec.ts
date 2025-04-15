import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { UserCreateDto } from './dtos/user.create.dto';
import { UserUpdateDto } from './dtos/user.update.dto';
import { SharedModule } from '../shared/shared.module';

const mockUsersService = {
  paginate: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAuthService = {
  userUUID: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should fetch paginated users', async () => {
    mockUsersService.paginate.mockResolvedValue({ data: [], meta: {} });
    const result = await controller.all(1);
    expect(result).toEqual({ data: [], meta: {} });
    expect(mockUsersService.paginate).toHaveBeenCalledWith(1, ['role']);
  });

  it('should create a user with hashed password', async () => {
    const dto: UserCreateDto = {
      firstName: 'Gustavo',
      lastName: 'Olmedo',
      email: 'golmedo@mail.com',
      roleUUID: 'role-uuid',
    };

    mockUsersService.save.mockResolvedValue({ uuid: 'user-id', ...dto });

    const result = await controller.create(dto);

    expect(mockUsersService.save).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        role: { uuid: dto.roleUUID },
      }),
    );
    expect(result.uuid).toEqual('user-id');
  });

  it('should get a user by uuid', async () => {
    mockUsersService.findOne.mockResolvedValue({ uuid: 'some-uuid' });
    const result = await controller.get('some-uuid');
    expect(result).toEqual({ uuid: 'some-uuid' });
    expect(mockUsersService.findOne).toHaveBeenCalledWith(
      { uuid: 'some-uuid' },
      ['role'],
    );
  });

  it('should update user info for logged-in user', async () => {
    const request = {};
    const dto: UserUpdateDto = {
      firstName: 'Gustavo',
      lastName: 'Updated',
      email: 'updated@mail.com',
      roleUUID: 'role-id',
    };

    mockAuthService.userUUID.mockResolvedValue('user-uuid');
    mockUsersService.update.mockResolvedValue(undefined);
    mockUsersService.findOne.mockResolvedValue({ uuid: 'user-uuid', ...dto });

    const result = await controller.updateInfo(request, dto);
    expect(result).toEqual({ uuid: 'user-uuid', ...dto });
  });

  it('should throw if passwords do not match', async () => {
    await expect(
      controller.updatePassword({}, 'pass123', 'mismatch'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should update password if match', async () => {
    const uuid = 'user-uuid';
    mockAuthService.userUUID.mockResolvedValue(uuid);
    mockUsersService.update.mockResolvedValue(undefined);
    mockUsersService.findOne.mockResolvedValue({ uuid });

    const result = await controller.updatePassword({}, 'pass123', 'pass123');

    expect(mockUsersService.update).toHaveBeenCalledWith(
      uuid,
      expect.objectContaining({ password: expect.any(String) }),
    );
    expect(result).toEqual({ uuid });
  });

  it('should update a user by uuid', async () => {
    const dto: UserUpdateDto = {
      firstName: 'New',
      lastName: 'Name',
      email: 'new@mail.com',
      roleUUID: 'role-123',
    };
    mockUsersService.update.mockResolvedValue(undefined);
    mockUsersService.findOne.mockResolvedValue({ uuid: 'some-uuid', ...dto });

    const result = await controller.update('some-uuid', dto);

    expect(result).toEqual({ uuid: 'some-uuid', ...dto });
    expect(mockUsersService.update).toHaveBeenCalledWith(
      'some-uuid',
      expect.any(Object),
    );
  });

  it('should delete a user by uuid', async () => {
    mockUsersService.delete.mockResolvedValue({ deleted: true });
    const result = await controller.delete('user-id');
    expect(result).toEqual({ deleted: true });
    expect(mockUsersService.delete).toHaveBeenCalledWith('user-id');
  });
});
