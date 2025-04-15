import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RolesService } from '../roles/roles.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let authService: jest.Mocked<AuthService>;
  let rolesService: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: UsersService,
          useValue: { save: jest.fn(), findOne: jest.fn() },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: AuthService, useValue: { userUUID: jest.fn() } },
        { provide: RolesService, useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    authService = module.get(AuthService);
    rolesService = module.get(RolesService);
  });

  it('should register a new user with hashed password and regular role', async () => {
    const dto = {
      firstName: 'Gustavo',
      lastName: 'Olmedo',
      email: 'golmedo@mail.com',
      password: 'pass123',
      passwordConfirm: 'pass123',
    };

    const role = { uuid: 'role-uuid', name: 'regular' };
    const savedUser = { uuid: 'user-uuid', ...dto };

    (rolesService.findOne as jest.Mock).mockResolvedValue(role);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (usersService.save as jest.Mock).mockResolvedValue(savedUser);

    const result = await controller.register(dto);

    expect(result).toEqual(savedUser);
    expect(usersService.save).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: dto.firstName,
        password: 'hashed-password',
        role: { uuid: role.uuid },
      }),
    );
  });

  it('should throw error if passwords do not match', async () => {
    await expect(
      controller.register({
        firstName: 'Gustavo',
        lastName: 'Olmedo',
        email: 'golmedo@mail.com',
        password: 'a',
        passwordConfirm: 'b',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should login and set cookie if credentials are valid', async () => {
    const user = {
      uuid: 'user-uuid',
      email: 'golmedo@mail.com',
      password: 'hashed',
    };
    const mockRes: any = { cookie: jest.fn() };

    (usersService.findOne as jest.Mock).mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt-token');

    const result = await controller.login(user.email, 'plaintext', mockRes);

    expect(mockRes.cookie).toHaveBeenCalledWith('jwt', 'jwt-token', {
      httpOnly: true,
    });
    expect(result).toEqual(user);
  });

  it('should throw NotFound if user not found during login', async () => {
    (usersService.findOne as jest.Mock).mockResolvedValue(undefined);

    await expect(
      controller.login('notfound@mail.com', 'any', {} as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequest if password is incorrect', async () => {
    const user = { uuid: 'uuid', password: 'hashed' };
    (usersService.findOne as jest.Mock).mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      controller.login('email@mail.com', 'wrong', {} as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return current user data using uuid from cookie', async () => {
    const mockRequest: any = {};
    const uuid = 'user-uuid';
    const user = { uuid, email: 'user@mail.com' };

    (authService.userUUID as jest.Mock).mockResolvedValue(uuid);
    (usersService.findOne as jest.Mock).mockResolvedValue(user);

    const result = await controller.user(mockRequest);
    expect(result).toEqual(user);
  });

  it('should clear cookie on logout', async () => {
    const mockRes: any = { clearCookie: jest.fn() };
    const result = await controller.logout(mockRes);
    expect(mockRes.clearCookie).toHaveBeenCalledWith('jwt');
    expect(result).toEqual({ message: 'Success' });
  });
});
