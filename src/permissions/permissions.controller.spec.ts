import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { SharedModule } from '../shared/shared.module';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let permissionsService: jest.Mocked<PermissionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      controllers: [PermissionsController],
      providers: [
        {
          provide: PermissionsService,
          useValue: {
            all: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
    permissionsService = module.get(PermissionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all permissions', async () => {
    const permissions = [
      { uuid: '1', name: 'view_users' },
      { uuid: '2', name: 'edit_users' },
    ];
    permissionsService.all.mockResolvedValue(permissions);

    const result = await controller.all();
    expect(result).toEqual(permissions);
    expect(permissionsService.all).toHaveBeenCalled();
  });
});
