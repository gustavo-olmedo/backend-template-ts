import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../app.module';
import { Permission } from '../permissions/models/permission.entity';
import { Role } from '../roles/models/role.entity';
import { UsersService } from '../users/users.service';
import { AuthIdentitiesService } from '../auth/auth-identities.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);
    const dataSource = app.get(DataSource);
    const authIdentities = app.get(AuthIdentitiesService);

    const permissionsRepo = dataSource.getRepository(Permission);
    const rolesRepo = dataSource.getRepository(Role);

    // 1) Upsert permissions (idempotent)
    const permissionNames = [
      'view_users',
      'edit_users',
      'view_roles',
      'edit_roles',
    ];
    const permissionsByName = new Map<string, Permission>();

    for (const name of permissionNames) {
      let p = await permissionsRepo.findOne({ where: { name } });
      if (!p) {
        p = permissionsRepo.create({ name });
        p = await permissionsRepo.save(p);
      }
      permissionsByName.set(name, p);
    }

    // 2) Upsert roles and attach permissions (idempotent)
    const rolesToCreate: Array<{
      name: string;
      isSystem: boolean;
      permissionNames: string[];
    }> = [
      { name: 'admin', isSystem: true, permissionNames: permissionNames }, // all
      {
        name: 'regular',
        isSystem: true,
        permissionNames: ['view_users', 'view_roles'],
      },
    ];

    for (const def of rolesToCreate) {
      let role = await rolesRepo.findOne({
        where: { name: def.name },
        relations: ['permissions'],
      });
      const wantedPerms = def.permissionNames.map(
        (n) => permissionsByName.get(n)!,
      );

      if (!role) {
        role = rolesRepo.create({
          name: def.name,
          isSystem: def.isSystem,
          permissions: wantedPerms,
          isActive: true,
        });
      } else {
        role.isSystem = def.isSystem;
        role.isActive = role.isActive ?? true;
        role.permissions = wantedPerms;
      }
      await rolesRepo.save(role);
    }

    const adminRole = await rolesRepo.findOne({ where: { name: 'admin' } });
    if (!adminRole) throw new Error('Admin role missing after seed.');

    // 3) Upsert admin user (no password column anymore)
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@mail.com';
    const adminPlainPassword =
      process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMeNow!123';

    let adminUser = await usersService.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await usersService.save({
        firstName: 'admin',
        lastName: 'admin',
        email: adminEmail,
        role: { id: adminRole.id },
      });
    } else if (!adminUser.role || adminUser.role.id !== adminRole.id) {
      adminUser.role = { id: adminRole.id } as any;
      adminUser = await usersService.save(adminUser);
    }

    // 4) Ensure admin has password identity
    await authIdentities.upsertPassword(adminUser, adminPlainPassword);

    console.log('✅ Permissions & roles seeded; admin user ensured.');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  } finally {
    // clean shutdown so Docker/Nest watchers don’t get confused
    await app.close();
    process.exit(process.exitCode ?? 0);
  }
}

bootstrap();
