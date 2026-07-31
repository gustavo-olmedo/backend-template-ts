import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';

import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { RolesService } from '../src/roles/roles.service';
import { PermissionsService } from '../src/permissions/permissions.service';
import { Permission } from '../src/permissions/models/permission.entity';
import { AuthIdentitiesService } from '../src/auth/auth-identities.service';
import { MailService } from '../src/mail/mail.service';

jest.setTimeout(30000);

async function runSeed(app: INestApplication) {
  const usersService = app.get(UsersService);
  const permissionsService = app.get(PermissionsService);
  const rolesService = app.get(RolesService);
  const authIdentitiesService = app.get(AuthIdentitiesService);

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

    const user = await usersService.save({
      firstName: 'admin',
      lastName: 'admin',
      email: 'admin@mail.com',
      role: { id: adminRole?.id },
    });
    await authIdentitiesService.upsertPassword(user, 'admin');
  } else {
    await authIdentitiesService.upsertPassword(adminUser, 'admin');
  }
}

async function cleanUpSeed(app: INestApplication) {
  const usersService = app.get(UsersService);
  const rolesService = app.get(RolesService);

  const adminUser = await usersService.findOne({ email: 'admin@mail.com' });
  if (adminUser) {
    await usersService.delete(adminUser.id);
  }

  const rolesToDelete = ['admin', 'regular'];
  for (const name of rolesToDelete) {
    const role = await rolesService.findOne({ name }, ['permissions']);
    if (role) await rolesService.delete(role.id);
  }
}

let app: INestApplication;
let accessCookie: string | undefined;
let createdUserId: string;
let createdRoleId: string;
let permissionIds: string[];

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailService)
    .useValue({ sendInvite: jest.fn(), sendReset: jest.fn() })
    .compile();

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
    accessCookie = cookies?.find((cookie: string) =>
      cookie.startsWith('access_token='),
    );
    expect(accessCookie).toBeDefined();
  });

  it('should get current user info', async () => {
    await request(app.getHttpServer())
      .get('/api/user')
      .set('Cookie', accessCookie!)
      .expect(200);
  });

  it('should logout successfully', async () => {
    await request(app.getHttpServer())
      .post('/api/logout')
      .set('Cookie', accessCookie!)
      .expect(201);
  });
});

describe('Roles & Permissions', () => {
  it('should login again to continue', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/login')
      .send({ email: 'admin@mail.com', password: 'admin' });

    accessCookie = res
      .get('Set-Cookie')
      ?.find((cookie: string) => cookie.startsWith('access_token='));
    expect(accessCookie).toBeDefined();
  });

  it('should fetch permissions list', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/permissions')
      .set('Cookie', accessCookie!)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    permissionIds = (res.body as Permission[]).map((permission) =>
      String(permission.id),
    );
  });

  it('should create a role with permissions', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/roles')
      .set('Cookie', accessCookie!)
      .send({
        name: 'test-role',
        permissionIds,
      })
      .expect(201);

    createdRoleId = res.body.id;
  });

  it('should update a role', async () => {
    await request(app.getHttpServer())
      .put(`/api/roles/${createdRoleId}`)
      .set('Cookie', accessCookie!)
      .send({ name: 'updated-role', permissionIds })
      .expect(200);
  });

  it('should fetch role by id', async () => {
    await request(app.getHttpServer())
      .get(`/api/roles/${createdRoleId}`)
      .set('Cookie', accessCookie!)
      .expect(200);
  });

  it('should delete the role', async () => {
    await request(app.getHttpServer())
      .delete(`/api/roles/${createdRoleId}`)
      .set('Cookie', accessCookie!)
      .expect(200);
  });
});

describe('Users', () => {
  let roleAdminId;

  beforeAll(async () => {
    const rolesService = app.get(RolesService);
    const adminRole = await rolesService.findOne({ name: 'admin' });
    roleAdminId = adminRole?.id;
  });

  it('should create a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/users')
      .set('Cookie', accessCookie!)
      .send({
        firstName: 'Gustavo',
        lastName: 'Olmedo',
        email: 'testuser@mail.com',
        roleId: roleAdminId,
      })
      .expect(201);

    createdUserId = res.body.id;
  });

  it('should fetch all users', async () => {
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Cookie', accessCookie!)
      .expect(200);
  });

  it('should get user by id', async () => {
    await request(app.getHttpServer())
      .get(`/api/users/${createdUserId}`)
      .set('Cookie', accessCookie!)
      .expect(200);
  });

  it('should update user by id', async () => {
    await request(app.getHttpServer())
      .put(`/api/users/${createdUserId}`)
      .set('Cookie', accessCookie!)
      .send({
        firstName: 'Updated',
        lastName: 'User',
        email: 'updated@mail.com',
        roleId: roleAdminId,
      })
      .expect(200);
  });

  it('should update logged in user info', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/info')
      .set('Cookie', accessCookie!)
      .send({
        firstName: 'Gustavo',
        lastName: 'Olmedo',
        email: 'admin@mail.com',
      })
      .expect(200);
  });

  it('should update logged in user password', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/password')
      .set('Cookie', accessCookie!)
      .send({
        password: 'admin',
        passwordConfirm: 'admin',
      })
      .expect(200);
  });

  it('should delete the user', async () => {
    await request(app.getHttpServer())
      .delete(`/api/users/${createdUserId}`)
      .set('Cookie', accessCookie!)
      .expect(200);
  });
});
