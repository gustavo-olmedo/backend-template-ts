import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';

import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { RolesService } from '../src/roles/roles.service';
import { PermissionsService } from '../src/permissions/permissions.service';
import { Permission } from '../src/permissions/models/permission.entity';

jest.setTimeout(30000);

async function runSeed(app: INestApplication) {
  const usersService = app.get(UsersService);
  const permissionsService = app.get(PermissionsService);
  const rolesService = app.get(RolesService);

  const permissionNames = [
    'view_users',
    'edit_users',
    'view_roles',
    'edit_roles',
  ];
  const permissions: Permission[] = [];

  for (const name of permissionNames) {
    let permission = await permissionsService.findOne({ name });
    if (!permission) {
      permission = await permissionsService.save({ name });
    }
    permissions.push(permission);
  }

  const rolesToCreate = [
    { name: 'admin', permissionNames },
    { name: 'regular', permissionNames: ['view_users', 'view_roles'] },
  ];

  for (const { name, permissionNames } of rolesToCreate) {
    let role = await rolesService.findOne({ name }, ['permissions']);
    const rolePermissions = permissions.filter((p) =>
      permissionNames.includes(p.name),
    );
    if (!role) {
      role = await rolesService.save({ name, permissions: rolePermissions });
    } else {
      role.permissions = rolePermissions;
      await rolesService.save(role);
    }
  }

  const adminUser = await usersService.findOne({ email: 'admin@mail.com' });

  if (!adminUser) {
    const adminRole = await rolesService.findOne({ name: 'admin' });

    const password = await bcrypt.hash('admin', 12);
    await usersService.save({
      firstName: 'admin',
      lastName: 'admin',
      email: 'admin@mail.com',
      password,
      role: { uuid: adminRole?.uuid },
    });
  }
}

async function cleanUpSeed(app: INestApplication) {
  const usersService = app.get(UsersService);
  const rolesService = app.get(RolesService);

  const adminUser = await usersService.findOne({ email: 'admin@mail.com' });
  if (adminUser) {
    await usersService.delete(adminUser.uuid);
  }

  const rolesToDelete = ['admin', 'regular'];
  for (const name of rolesToDelete) {
    let role = await rolesService.findOne({ name }, ['permissions']);
    if (role) await rolesService.delete(role.uuid);
  }
}

let app: INestApplication;
let jwtCookie: string | undefined;
let createdUserId: string;
let createdRoleId: string;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  await app.init();

  await runSeed(app); // Run seed data for tests
});

afterAll(async () => {
  console.log('🧹 Starting cleanup...');
  try {
    await cleanUpSeed(app);
  } catch (err) {
    console.error('❌ cleanUpSeed failed:', err);
  }
  await app.close();
});

describe('Auth', () => {
  it('should login and return a token in cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/login')
      .send({ email: 'admin@mail.com', password: 'admin' })
      .expect(201);

    const cookies = res.get('Set-Cookie');
    expect(cookies).toBeDefined();
    jwtCookie = cookies?.find((cookie: string) => cookie.startsWith('jwt='));
    expect(jwtCookie).toBeDefined();
  });

  it('should get current user info', async () => {
    await request(app.getHttpServer())
      .get('/api/user')
      .set('Cookie', jwtCookie!)
      .expect(200);
  });

  it('should logout successfully', async () => {
    await request(app.getHttpServer())
      .post('/api/logout')
      .set('Cookie', jwtCookie!)
      .expect(201);
  });
});

describe('Roles & Permissions', () => {
  it('should login again to continue', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/login')
      .send({ email: 'admin@mail.com', password: 'admin' });

    jwtCookie = res
      .get('Set-Cookie')
      ?.find((cookie: string) => cookie.startsWith('jwt='));
    expect(jwtCookie).toBeDefined();
  });

  it('should fetch permissions list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/permissions')
      .set('Cookie', jwtCookie!)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create a role with permissions', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/roles')
      .set('Cookie', jwtCookie!)
      .send({
        name: 'test-role',
        permissions: [],
      })
      .expect(201);

    createdRoleId = res.body.uuid;
  });

  it('should update a role', async () => {
    await request(app.getHttpServer())
      .put(`/api/roles/${createdRoleId}`)
      .set('Cookie', jwtCookie!)
      .send({ name: 'updated-role', permissions: [] })
      .expect(200);
  });

  it('should fetch role by id', async () => {
    await request(app.getHttpServer())
      .get(`/api/roles/${createdRoleId}`)
      .set('Cookie', jwtCookie!)
      .expect(200);
  });

  it('should delete the role', async () => {
    await request(app.getHttpServer())
      .delete(`/api/roles/${createdRoleId}`)
      .set('Cookie', jwtCookie!)
      .expect(200);
  });
});

describe('Users', () => {
  let roleAdminUUID;

  beforeAll(async () => {
    const rolesService = app.get(RolesService);
    const adminRole = await rolesService.findOne({ name: 'admin' });
    roleAdminUUID = adminRole?.uuid;
  });

  it('should create a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/users')
      .set('Cookie', jwtCookie!)
      .send({
        firstName: 'Gustavo',
        lastName: 'Olmedo',
        email: 'testuser@mail.com',
        password: 'Password123',
        passwordConfirm: 'Password123',
        roleUUID: roleAdminUUID,
      })
      .expect(201);

    createdUserId = res.body.uuid;
  });

  it('should fetch all users', async () => {
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Cookie', jwtCookie!)
      .expect(200);
  });

  it('should get user by id', async () => {
    await request(app.getHttpServer())
      .get(`/api/users/${createdUserId}`)
      .set('Cookie', jwtCookie!)
      .expect(200);
  });

  it('should update user by id', async () => {
    await request(app.getHttpServer())
      .put(`/api/users/${createdUserId}`)
      .set('Cookie', jwtCookie!)
      .send({
        firstName: 'Updated',
        lastName: 'User',
        email: 'updated@mail.com',
        roleUUID: roleAdminUUID,
      })
      .expect(200);
  });

  it('should update logged in user info', async () => {
    await request(app.getHttpServer())
      .put('/api/users/info')
      .set('Cookie', jwtCookie!)
      .send({
        firstName: 'Gustavo',
        lastName: 'Olmedo',
        email: 'admin@mail.com',
        roleUUID: roleAdminUUID,
      })
      .expect(200);
  });

  it('should update logged in user password', async () => {
    await request(app.getHttpServer())
      .put('/api/users/password')
      .set('Cookie', jwtCookie!)
      .send({
        password: 'admin',
        passwordConfirm: 'admin',
      })
      .expect(200);
  });

  it('should delete the user', async () => {
    await request(app.getHttpServer())
      .delete(`/api/users/${createdUserId}`)
      .set('Cookie', jwtCookie!)
      .expect(200);
  });
});
