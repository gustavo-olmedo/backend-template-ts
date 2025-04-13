import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Permission } from 'src/permissions/models/permission.entity';
import { Role } from 'src/roles/models/role.entity';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsersService } from 'src/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const dataSource = app.get(DataSource);

  const permissionsRepo = dataSource.getRepository(Permission);
  const rolesRepo = dataSource.getRepository(Role);

  // Create permissions
  const permissionNames = [
    'view_users',
    'edit_users',
    'view_roles',
    'edit_roles',
  ];

  const permissions: Permission[] = [];

  for (const name of permissionNames) {
    let permission = await permissionsRepo.findOne({ where: { name } });

    if (!permission) {
      permission = permissionsRepo.create({ name });
      await permissionsRepo.save(permission);
    }

    permissions.push(permission);
  }

  // Create roles
  const rolesToCreate = [
    {
      name: 'admin',
      permissionNames: permissionNames, // all permissions
    },
    {
      name: 'regular',
      permissionNames: ['view_users', 'view_roles'], // limited
    },
  ];

  for (const { name, permissionNames } of rolesToCreate) {
    let role = await rolesRepo.findOne({
      where: { name },
      relations: ['permissions'],
    });

    const rolePermissions = permissions.filter((p) =>
      permissionNames.includes(p.name),
    );

    if (!role) {
      role = rolesRepo.create({ name, permissions: rolePermissions });
    } else {
      role.permissions = rolePermissions;
    }

    await rolesRepo.save(role);
  }

  // Create admin user
  const password = await bcrypt.hash('admin', 12);

  await usersService.save({
    firstName: 'admin',
    lastName: 'admin',
    email: 'admin@mail.com',
    password,
  });

  console.log('✅ Permissions and roles created, admin user seeded.');
  process.exit();
}

bootstrap();
