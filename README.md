# 🐳 NestJS Backend Template

A ready-to-use NestJS backend template with:

- PostgreSQL via Docker
- Role & Permission system (with seeder)
- Environment-based configuration
- Authentication with JWT

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/gustavo-olmedo/backend-template-ts.git
cd backend-template-ts
```

### 2️⃣ Install dependencies

```bash
yarn install
```

> This will install all required packages and fix common post-install issues.

### 3️⃣ Configure environment variables

Create a `.env` file based on the provided `.env.example`:

```bash
cp .env.example .env
```

Fill in the values (or leave the defaults):

```env
ENV=development

POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_PASSWORD=postgres
POSTGRES_USER=postgres
POSTGRES_DATABASE=postgres

DEFAULT_ADMIN_EMAIL=admin@mail.com
DEFAULT_ADMIN_PASSWORD=admin

JWT_SECRET=your-secret-key
```

> 🔐 Make sure to use a strong `JWT_SECRET` in production!

### 4️⃣ Start the application

Use Docker Compose to spin up the backend and Postgres services:

```bash
docker compose up --build
```

Wait until the services are fully running (Nest app should log that it's ready).

### 5️⃣ Seed roles, permissions, and the default admin user

In a **separate terminal**, run the following:

```bash
docker compose exec nest-backend yarn seed:permissions-roles
```

This will:

- Create the roles: `admin`, `regular`
- Create the permissions: `view_users`, `edit_users`, `view_roles`, `edit_roles`
- Create an **admin user** using:
  - `DEFAULT_ADMIN_EMAIL`
  - `DEFAULT_ADMIN_PASSWORD`

## 🔐 Logging In

After seeding, you can log in using the admin credentials defined in your `.env` file:

```
Email:    admin@mail.com
Password: admin
```

> You’ll receive a JWT token to authenticate future requests.

## 🧪 Useful Commands

| Command                                                        | Description                                               |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| `yarn start:dev`                                               | Start the app in watch mode locally (if not using Docker) |
| `docker compose up`                                            | Start the backend and DB                                  |
| `docker compose exec nest-backend yarn seed:permissions-roles` | Seed initial data                                         |

## 🛠 Tech Stack

- [NestJS](https://nestjs.com/)
- [TypeORM](https://typeorm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)
- [Yarn](https://yarnpkg.com/)

## 📂 Project Structure

```bash
src/
  auth/              # Auth logic (JWT, guards, strategies)
  users/             # Users module
  roles/             # Roles module
  permissions/       # Permissions module
  shared/            # Shared logic (JwtModule, etc.)
  commands/          # Seeder scripts (like permissions-roles)
```

## ✅ Next Steps

- Set up Swagger docs
- Add user profile management

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Run initial seeds to setup security

```
docker compose exec nest-backend yarn seed:permissions-roles
```

## DB setup

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
