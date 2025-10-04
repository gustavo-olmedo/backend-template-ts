import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { SharedModule } from '../shared/shared.module';
import { Role } from './models/role.entity';

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            all: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get(RolesService);
  });

  it('should return all roles', async () => {
    const roles = [
      {
        id: '1',
        name: 'admin',
        permissions: [],
        isActive: true,
        isSystem: true,
      },
    ];
    rolesService.all.mockResolvedValue(roles);

    const result = await controller.all();
    expect(result).toEqual(roles);
    expect(rolesService.all).toHaveBeenCalled();
  });

  it('should create a role with permissions', async () => {
    const input = {
      name: 'editor',
      permissions: ['p1', 'p2'],
    };
    const savedRole = {
      id: 'r1',
      name: 'editor',
      isActive: true,
      isSystem: true,
      permissions: input.permissions.map((id) => ({
        id,
        name: 'view_users',
      })),
    };
    rolesService.save.mockResolvedValue(savedRole);

    const result = await controller.create(input.name, input.permissions);
    expect(result).toEqual(savedRole);
    expect(rolesService.save).toHaveBeenCalledWith({
      name: input.name,
      permissions: input.permissions.map((id) => ({ id })),
    });
  });

  it('should return a role by id', async () => {
    const role = {
      id: 'r1',
      name: 'admin',
      permissions: [],
      isActive: true,
      isSystem: true,
    };
    rolesService.findOne.mockResolvedValue(role);

    const result = await controller.get('r1');
    expect(result).toEqual(role);
    expect(rolesService.findOne).toHaveBeenCalledWith({ id: 'r1' }, [
      'permissions',
    ]);
  });

  it('should update an existing role', async () => {
    const existingRole = {
      id: 'r1',
      name: 'admin',
      permissions: [],
      isActive: true,
      isSystem: true,
    };
    const updatedRole = {
      ...existingRole,
      name: 'regular',
      permissions: [{ id: 'p1' }],
    };

    rolesService.findOne.mockResolvedValue(existingRole);
    rolesService.save.mockResolvedValue(updatedRole as Role);

    const result = await controller.update('r1', 'regular', ['p1']);
    expect(result).toEqual(updatedRole);
    expect(rolesService.save).toHaveBeenCalledWith(updatedRole);
  });

  it('should throw NotFoundException if role does not exist during update', async () => {
    rolesService.findOne.mockResolvedValue(null);
    await expect(controller.update('missing', 'role', [])).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should delete a role', async () => {
    rolesService.delete.mockResolvedValue({ affected: 1 });
    const result = await controller.delete('r1');
    expect(result).toEqual({ affected: 1 });
    expect(rolesService.delete).toHaveBeenCalledWith('r1');
  });
});
