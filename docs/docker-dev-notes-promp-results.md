# NestJS + Docker Dev Cheatsheet

A quick-reference for resetting containers, handling Postgres collation warnings, hot-reload stability, and seed scripts in this project.

> **Service names used below**: `nest-backend` (API), `db` (Postgres), `pgadmin` (optional UI).  
> **DB bind mount**: `./pgdata:/var/lib/postgresql/data` (deleting `./pgdata` wipes your database).

---

## 1) Clean rebuild (keep DB data)

Use this when code or deps got weird but you **don’t** want to lose Postgres data.

```bash
rm -rf dist node_modules
docker compose down -v --remove-orphans
docker volume prune -f           # removes *dangling* named volumes across Docker; be careful
docker builder prune -f          # clears build cache (safe)
yarn install                     # or npm ci
docker compose up --build
```

**Does this delete my DB data?**  
**No.** Because your DB uses a **bind mount** (`./pgdata`), not a named volume. `down -v` only drops **named** volumes from this project (e.g. `node_modules`). The `./pgdata` folder on your host remains.

---

## 2) Full reset (wipe DB data)

Use when you want a clean Postgres state (e.g., schema churn in dev).

```bash
docker compose down -v
rm -rf ./pgdata                 # ← this deletes the DB files on your host
docker compose up --build
```

**Does this delete my DB data?**  
**Yes.** Removing `./pgdata` completely resets Postgres.

> If you ever switch to a **named** volume for Postgres (e.g., `pgdata:/var/lib/postgresql/data`), you’d drop it with:
>
> ```bash
> docker compose down -v
> docker volume rm <yourproject>_pgdata
> ```

---

## 3) Fix “collation version mismatch” warnings (keep data)

When the base OS/libc/ICU in the Postgres image changes, you’ll see warnings like _“database was created using collation version 2.36, OS provides 2.41”_. Fix by reindexing & refreshing collation version.

```bash
# Reindex and refresh your main DB (replace 'app' if you used a different DB name)
docker compose exec db psql -U postgres -d app      -c 'REINDEX DATABASE app;'
docker compose exec db psql -U postgres -d postgres -c 'ALTER DATABASE app REFRESH COLLATION VERSION;'

# Also update the postgres maintenance DB, and template1 (optional but tidy)
docker compose exec db psql -U postgres -d postgres -c 'REINDEX DATABASE postgres;'
docker compose exec db psql -U postgres -d postgres -c 'ALTER DATABASE postgres REFRESH COLLATION VERSION;'
docker compose exec db psql -U postgres -d template1 -c 'REINDEX DATABASE template1;'
docker compose exec db psql -U postgres -d postgres  -c 'ALTER DATABASE template1 REFRESH COLLATION VERSION;'
```

Check current collation info:

```sql
SELECT datname, datcollate, datctype, datcollversion FROM pg_database;
```

---

## 4) Make hot-reload stable in Docker

**Dockerfile (Debian slim)**: add `procps` (for `ps`) and `tini` (PID 1 / signal handling).

```dockerfile
FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
      procps tini \
 && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["yarn","start:dev"]
```

The current **docker-compose.yml** enables polling watchers and keeps
dependencies in a named volume:

```yaml
services:
  nest-backend:
    command: >
      sh -lc "yarn install --frozen-lockfile --check-files &&
              yarn start:dev"
    environment:
      - NODE_ENV=development
      - CHOKIDAR_USEPOLLING=true
      - CHOKIDAR_INTERVAL=800
      - WATCHPACK_POLLING=true
      - TSC_WATCHFILE=UsePolling
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    depends_on:
      - db

  db:
    image: postgres:16-bookworm
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=app
    volumes:
      - ./pgdata:/var/lib/postgresql/data

volumes:
  node_modules:
```

---

## 5) TypeORM setup

- The current project uses:
  ```ts
  TypeOrmModule.forRoot({
    // ...
    autoLoadEntities: process.env.NODE_ENV !== 'production',
    synchronize: true,
  });
  ```
- `synchronize: true` is convenient for this template's development database,
  but production deployments should use migrations and disable synchronization.
- Register entities in feature modules: `TypeOrmModule.forFeature([User, Role, Permission, ...])`.
- Keep imports consistent (avoid mixing `src/...` and relative paths for entities).

---

## 6) Running the seeders

**Files**:

- `src/commands/permissions-roles.seeder.ts` – creates permissions/roles + ensures admin user and password identity.
- `src/commands/users.seeder.ts` – adds 10 regular users with password identities.

**Current scripts** (TypeScript):

```jsonc
{
  "scripts": {
    "seed:permissions-roles": "ts-node src/commands/permissions-roles.seeder.ts --env-file .env",
    "seed:users": "ts-node src/commands/users.seeder.ts --env-file .env",
  },
}
```

**Run inside the container** (after `docker compose up`):

```bash
docker compose exec nest-backend yarn seed:permissions-roles
docker compose exec nest-backend yarn seed:users
```

**Env vars used by seeders**:

- `DEFAULT_ADMIN_EMAIL` (default: `admin@mail.com`)
- `DEFAULT_ADMIN_PASSWORD` (default: `ChangeMeNow!123`)
- `DEMO_USER_PASSWORD` (default: `Password123!`)
- `BCRYPT_COST` (default: `12`)

---

## 7) Handy Docker/DB commands

Logs:

```bash
docker compose logs -f nest-backend
docker compose logs -f db
```

Shells:

```bash
docker compose exec nest-backend sh
docker compose exec db bash   # or sh, depending on image
```

psql prompt into your app DB:

```bash
docker compose exec db psql -U postgres -d app
```

Rebuild just the backend image:

```bash
docker compose build nest-backend && docker compose up -d nest-backend
```

---

## 8) Troubleshooting quick hits

- **`spawn ps ENOENT` on reload** → install `procps` in the image (see Dockerfile above).
- **Entity metadata not found** → use `autoLoadEntities: true`, register entities with `forFeature`, and ensure your entity globs match compiled `.js` in `dist`.
- **Join table PK errors** when renaming columns → avoid `synchronize` on non-empty DBs; write a migration to reshape join tables or do a dev DB reset.
- **Collation mismatch warnings** after image upgrade → run the **Reindex + Refresh** sequence in section 3.
- **File changes not triggering** → use the polling env vars in section 4.

---

## 9) Safety notes

- `docker volume prune -f` removes **dangling volumes globally**. Avoid in production shells.
- `rm -rf ./pgdata` **permanently deletes your dev database** (bind mount). Make a backup first if you need the data.
- Keep your `postgres:16-<distro>` tag pinned (e.g., `16-bookworm`) to reduce unexpected collation bumps.
