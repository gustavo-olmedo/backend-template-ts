import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../app.module';
import { Role } from '../roles/models/role.entity';
import { UsersService } from '../users/users.service';
import { AuthIdentitiesService } from '../auth/auth-identities.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);
    const dataSource = app.get(DataSource);
    const authIdentities = app.get(AuthIdentitiesService);

    const rolesRepo = dataSource.getRepository(Role);
    const regularRole = await rolesRepo.findOne({ where: { name: 'regular' } });
    if (!regularRole)
      throw new Error(
        'Regular role not found. Run permissions-roles.seeder first.',
      );

    const basePassword = process.env.DEMO_USER_PASSWORD || 'Password123!';
    const emails = Array.from(
      { length: 10 },
      (_, i) => `user${i + 1}@mail.com`,
    );

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const firstName = `User${i + 1}`;
      const lastName = 'Demo';

      let user = await usersService.findOne({ email });

      if (!user) {
        user = await usersService.save({
          firstName,
          lastName,
          email,
          role: { id: regularRole.id },
        });
      } else if (!user.role || user.role.id !== regularRole.id) {
        user.role = { id: regularRole.id } as any;
        user = await usersService.save(user);
      }

      // ensure password identity exists / is updated
      await authIdentities.upsertPassword(user, basePassword);
    }

    console.log('✅ Seeded 10 regular users (with password identities).');
  } catch (err) {
    console.error('❌ Users seed failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
    process.exit(process.exitCode ?? 0);
  }
}

bootstrap();
