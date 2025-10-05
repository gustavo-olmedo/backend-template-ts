# 🐳 NestJS Backend Template

A ready-to-use NestJS backend template with:

- PostgreSQL via Docker
- Role & Permission system (seeders included)
- Authentication with JWT (HTTP-only cookies for refresh) + **Password identities in `auth_identities`**
- **Sessions** table with refresh-token rotation
- **Devices** tracking (register/heartbeat/push token)
- **Google SSO** (verify ID token server-side)
- Environment-based configuration
- Docker-friendly hot-reload setup

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/gustavo-olmedo/backend-template-ts.git
cd backend-template-ts
```

### Install dependencies

```bash
yarn install
```

> This will install all required packages and fix common post-install issues.

### Configure environment variables

Create a `.env` file based on the provided `.env.example`:

```bash
cp .env.example .env
```

Fill in the values (or leave the defaults):

```env
NODE_ENV=test
PUBLIC_BASE_URL=http://localhost:8000 #runs in 3000 but docker-compose maps it to 8000

POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_PASSWORD=postgres
POSTGRES_USER=postgres
POSTGRES_DATABASE=test_db

DEFAULT_ADMIN_EMAIL=admin@mail.com
DEFAULT_ADMIN_PASSWORD=admin

# auth jwt token
AUTH_COOKIE_NAME=access_token
AUTH_REFRESH_COOKIE_NAME=refresh_token
JWT_SECRET=JWT_SECRET
BCRYPT_COST=12

# Test (local saving)
FILE_STORAGE_DRIVER=local
UPLOADS_ROOT=./uploads
UPLOADS_AVATAR_DIR=avatars


# emails
MAIL_TRANSPORT=smtp://USERNAME:PASSWORD@smtp.ethereal.email:587 # Create credentials at https://ethereal.email/ and view messages in their web UI
MAIL_FROM=gustavoemailprueba@gmail.com

# sso gogle
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID
```

> 🔐 Make sure to use a strong `JWT_SECRET` in production!

### Start the application

Use Docker Compose to spin up the backend and Postgres services:

```bash
docker compose up
```

Wait until the services are fully running (Nest app should log that it's ready).

- API: http://localhost:8000 (proxied to Nest 3000 in container)
- Postgres: localhost:5432 (container: `db`)
- PgAdmin (optional): http://localhost:5050

### Seed roles, permissions, and the default admin user

In a **separate terminal**, run the following:

```bash
yarn seed:permissions-roles:docker
```

This will:

- Create the roles: `admin`, `regular`
- Create the permissions: `view_users`, `edit_users`, `view_roles`, `edit_roles`
- Create an **admin user** using:
  - `DEFAULT_ADMIN_EMAIL`
  - `DEFAULT_ADMIN_PASSWORD`

### Seed 10 regular users

In a **separate terminal**, run the following:

```bash
yarn seed:users:docker
```

This will:

- Create 10 users
- All users will have `regular` role

## 🔐 Logging In

After seeding, you can log in using the admin credentials defined in your `.env` file:

```
Email:    admin@mail.com
Password: admin
```

> You’ll receive a JWT token to authenticate future requests.

## 🧪 Useful Commands

| Command                       | Description                                               |
| ----------------------------- | --------------------------------------------------------- |
| `yarn start:dev`              | Start the app in watch mode locally (if not using Docker) |
| `docker compose up`           | Start the backend and DB                                  |
| `yarn seed:permissions-roles` | Seed initial data                                         |
| `yarn seed:users`             | Seed 10 regular users                                     |

## 🛠 Tech Stack

- [NestJS](https://nestjs.com/)
- [TypeORM](https://typeorm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)
- [Yarn](https://yarnpkg.com/)

## 📂 Project Structure

```bash
src/
  auth/                # Auth logic, guards, sessions, SSO, identities
  devices/             # Device registration / heartbeat / tokens
  users/               # Users module
  roles/               # Roles module
  permissions/         # Permissions module
  file-storage/        # Abstraction for avatar uploads (local/cloud)
  commands/            # Seeders (permissions-roles, users)
```

## ✅ Next Steps

- Add from/to dates to paginate to get all entities filter by date
- Add query parameter to paginate to filter entities by different properties
- Add sortBy and desc parameters to paginate to sort entities by property
- Set up Swagger docs

## PgAdmin DB setup

1. Open PgAdmin in the web browser by visiting http://localhost:5050 (assuming we're using the default configuration in the docker-compose.yml file).
2. Log in using your email and password in the docker-compose.yml file for the pgadmin service.
3. In the left-hand sidebar, click Servers to expand the Servers menu.
4. Right-click on Servers and select Register -> Server.
5. In the General tab of the Create - Server dialog, we can give the server a name of our choice.
6. In the Connection tab, fill in the following details:
   Host name/address: db
   Port: 5432
   Maintenance database: postgres
   Username: postgres
   Password: postgres
7. Click Save to save the server configuration.

## More about Compiling and runing the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash

# unit tests using containers
$ yarn run test:docker

# e2e tests using containers
$ yarn run test:e2e:docker

# test coverage using containers
$ yarn run test:cov:docker

# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.
