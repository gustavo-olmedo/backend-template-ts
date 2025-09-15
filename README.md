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
NODE_ENV=development

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
docker compose up
```

Wait until the services are fully running (Nest app should log that it's ready).

### 5️⃣ Seed roles, permissions, and the default admin user

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

## 📡 API Endpoints (with curl examples)

> 🧠 Replace `<TOKEN>` with your JWT when required.

---

### 🔐 Auth

#### `POST /api/login`

Authenticate a user and return a JWT.

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mail.com",
    "password": "admin"
  }'
```

#### `POST /api/register`

Register a new user.

```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "gustavo register",
    "lastName": "olmedo register",
    "email": "mail@mail.com",
    "password": "Password",
    "passwordConfirm": "Password"
  }'
```

#### `GET /api/user`

Get current user info.

```bash
curl http://localhost:8000/api/user \
  -H "Authorization: Bearer <TOKEN>"
```

#### `POST /api/logout`

Log out the current user.

```bash
curl -X POST http://localhost:8000/api/logout \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 👥 Users

#### `GET /api/users`

List all users.

```bash
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer <TOKEN>"
```

#### `GET /api/users/:uuid`

Get a single user by UUID.

```bash
curl http://localhost:8000/api/users/<USER_UUID> \
  -H "Authorization: Bearer <TOKEN>"
```

#### `POST /api/users`

Create a new user.

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "gustavo",
    "lastName": "olmedo",
    "email": "mail@mail.com",
    "password": "Password",
    "passwordConfirm": "Password",
    "roleUUID": "eb3bf529-63fd-4585-8f0a-53d588172a6e"
  }'
```

#### `PUT /api/users/:uuid`

Update a user by UUID.

```bash
curl -X PUT http://localhost:8000/api/users/<USER_UUID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "gustavo",
    "lastName": "olmedo",
    "email": "golmedo@mail.com",
    "roleUUID": "eb3bf529-63fd-4585-8f0a-53d588172a6e"
  }'
```

#### `PUT /api/users/info`

Update current user's info.

```bash
curl -X PUT http://localhost:8000/api/users/info \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "gustavo",
    "lastName": "olmedo",
    "email": "admin@mail.com",
  }'
```

#### `PUT /api/users/password`

Change current user's password.

```bash
curl -X PUT http://localhost:8000/api/users/password \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "admin",
    "passwordConfirm": "admin"
  }'
```

#### `DELETE /api/users/:uuid`

Delete a user by UUID.

```bash
curl -X DELETE http://localhost:8000/api/users/<USER_UUID> \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 🔐 Permissions

#### `GET /api/permissions`

List all permissions.

```bash
curl http://localhost:8000/api/permissions \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 🛡️ Roles

#### `GET /api/roles`

List all roles.

```bash
curl http://localhost:8000/api/roles \
  -H "Authorization: Bearer <TOKEN>"
```

#### `GET /api/roles/:uuid`

Get a role by UUID.

```bash
curl http://localhost:8000/api/roles/<ROLE_UUID> \
  -H "Authorization: Bearer <TOKEN>"
```

#### `POST /api/roles`

Create a new role.

```bash
curl -X POST http://localhost:8000/api/roles \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test",
    "permissionUUIDs": ["99083e51-8916-4e2e-8cd1-7c2957032d58"]
  }'
```

#### `PUT /api/roles/:uuid`

Update a role.

```bash
curl -X PUT http://localhost:8000/api/roles/<ROLE_UUID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test",
    "permissionUUIDs": ["99083e51-8916-4e2e-8cd1-7c2957032d58"]
  }'
```

#### `DELETE /api/roles/:uuid`

Delete a role.

```bash
curl -X DELETE http://localhost:8000/api/roles/<ROLE_UUID> \
  -H "Authorization: Bearer <TOKEN>"
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.
