# 📡 API Reference

Base URL (dev): **http://localhost:8000/api**

Authentication:

- Protected endpoints currently require the HTTP-only `access_token` cookie.
- `POST /token/refresh` and `POST /logout` use the HTTP-only
  `refresh_token` cookie.
- `POST /login` and `POST /sso/google` return `{ user, accessToken }` and set
  both cookies.
- Although some internal helpers understand Bearer access tokens, the current
  `AuthGuard` is cookie-only. Use the cookie jar in the examples below.

Example for saving cookies with `curl`:

```bash
# Login and store cookies in cookies.txt
curl -i -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt -b cookies.txt \
  -d '{ "email": "admin@mail.com", "password": "ChangeMe123!",
        "appInstanceId": "11111111-1111-1111-1111-111111111111",
        "platform": "web" }'
```

---

## 🔐 Auth

### POST `/register`

Register a user with the **regular** role.

```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "Alice", "lastName": "Doe",
        "email": "alice@mail.com",
        "password": "Password123!",
        "passwordConfirm": "Password123!" }'
```

**Response**: `201 Created` → `User` JSON.

---

### POST `/login`

Authenticate with email/password. Creates a session, sets both authentication
cookies, and returns the access token.

```bash
curl -i -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt -b cookies.txt \
  -d '{ "email": "admin@mail.com", "password": "ChangeMe123!",
        "appInstanceId": "11111111-1111-1111-1111-111111111111",
        "platform": "web", "pushToken": null }'
```

**Response**: `201 Created` → `{ user, accessToken }`

---

### POST `/token/refresh`

Get a new access/refresh pair using refresh cookie.

```bash
curl -i -X POST http://localhost:8000/api/token/refresh \
  -c cookies.txt -b cookies.txt
```

**Response**: `201 Created` → `{ ok: true }` and sets new cookies.

---

### POST `/logout`

Revoke the current session and clear cookies.

```bash
curl -X POST http://localhost:8000/api/logout \
  -c cookies.txt -b cookies.txt
```

**Response**: `201 Created` → `{ message: "Success" }`

---

### POST `/forgot-password`

Issue a reset token and send email (no user existence leak).

```bash
curl -X POST http://localhost:8000/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "alice@mail.com" }'
```

**Response**: `201 Created` → `{ ok: true, message: "If that email exists, we sent a reset link." }`

---

### POST `/set-password`

Consume a token and set a new password.

```bash
curl -X POST http://localhost:8000/api/set-password \
  -H "Content-Type: application/json" \
  -d '{ "token": "<TOKEN_FROM_EMAIL>",
        "type": "reset",
        "password": "NewPassw0rd!",
        "passwordConfirm": "NewPassw0rd!" }'
```

**Response**: `201 Created` → `{ ok: true, message: "Password updated" }`

> _Implementation note_: Password hashes live in `auth_identities` (`provider="password"`).

---

### POST `/sso/google`

Login with Google ID token. Creates a user if missing.

```bash
curl -X POST http://localhost:8000/api/sso/google \
  -H "Content-Type: application/json" \
  -d '{ "idToken": "<GOOGLE_ID_TOKEN>",
        "appInstanceId": "22222222-2222-2222-2222-222222222222",
        "platform": "web" }'
```

**Response**: `201 Created` → `{ user, accessToken }`

---

### GET `/user` _(Auth required)_

Current user profile.

```bash
curl http://localhost:8000/api/user \
  -b cookies.txt
```

---

## 📱 Devices (Auth required)

### POST `/devices/register`

Register or upsert a device by `appInstanceId`.

```bash
curl -X POST http://localhost:8000/api/devices/register \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "appInstanceId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "platform": "web",
        "pushToken": null,
        "locale": "en-US",
        "timezone": "Europe/Lisbon" }'
```

**Response**: `201 Created` → `{ id: "<DEVICE_ID>" }`

---

### POST `/devices/heartbeat`

Mark device as seen now.

```bash
curl -X POST http://localhost:8000/api/devices/heartbeat \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "appInstanceId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }'
```

**Response**: `201 Created` → `{ ok: true }`

---

### PATCH `/devices/:id/token`

Update push token.

```bash
curl -X PATCH http://localhost:8000/api/devices/<DEVICE_ID>/token \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "pushToken": null }'
```

**Response**: `200 OK` → `{ ok: true }`

---

### GET `/devices`

List current user's devices.

```bash
curl http://localhost:8000/api/devices \
  -b cookies.txt
```

---

### DELETE `/devices/:id`

Revoke a device.

```bash
curl -X DELETE http://localhost:8000/api/devices/<DEVICE_ID> \
  -b cookies.txt
```

**Response**: `200 OK` → `{ ok: true }`

---

## 🔐 Permissions (Auth required)

### GET `/permissions`

```bash
curl http://localhost:8000/api/permissions \
  -b cookies.txt
```

---

## 🛡️ Roles (Auth required + permission: `roles`)

### GET `/roles`

Returns active roles with their permissions. The internal `isActive` and
`isSystem` flags are omitted from this list response.

```bash
curl http://localhost:8000/api/roles \
  -b cookies.txt
```

### GET `/roles/:id`

```bash
curl http://localhost:8000/api/roles/<ROLE_ID> \
  -b cookies.txt
```

### POST `/roles`

Create a role with attached permissions.

```bash
curl -X POST http://localhost:8000/api/roles \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "name": "moderator", "permissionIds": ["<PERMISSION_ID>"] }'
```

### PUT `/roles/:id`

Update a role.

```bash
curl -X PUT http://localhost:8000/api/roles/<ROLE_ID> \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "name": "moderator", "permissionIds": ["<PERMISSION_ID>"] }'
```

### DELETE `/roles/:id`

Soft-delete (deactivate) non-system roles. System roles are returned unchanged.

```bash
curl -X DELETE http://localhost:8000/api/roles/<ROLE_ID> \
  -b cookies.txt
```

---

## 👥 Users (Auth required + permission: `users`)

### GET `/users` (paginated)

```bash
curl 'http://localhost:8000/api/users?page=1' \
  -b cookies.txt
```

Pages contain 7 users and return `{ data, meta: { total, page, lastPage } }`.

### GET `/users/:id`

```bash
curl http://localhost:8000/api/users/<USER_ID> \
  -b cookies.txt
```

### POST `/users`

Create a user and send invite email with password token.

```bash
curl -X POST http://localhost:8000/api/users \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "John", "lastName": "Smith",
        "email": "john@mail.com", "roleId": "<ROLE_ID>" }'
```

**Response**: `201 Created` → `User` JSON

---

### PUT `/users/:id`

Update user and role.

```bash
curl -X PUT http://localhost:8000/api/users/<USER_ID> \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "John", "lastName": "Smith",
        "email": "john.smith@mail.com", "roleId": "<ROLE_ID>" }'
```

---

### PATCH `/users/info`

Update the current user's profile.

```bash
curl -X PATCH http://localhost:8000/api/users/info \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "Alice", "lastName": "Doe", "email": "alice@mail.com" }'
```

---

### PATCH `/users/password`

Change current user's password.

```bash
curl -X PATCH http://localhost:8000/api/users/password \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "password": "NewPassw0rd!", "passwordConfirm": "NewPassw0rd!" }'
```

> This triggers an `auth_identity` upsert for `provider="password"`.

---

### PATCH `/users/avatar`

Upload/replace avatar (`multipart/form-data`).

```bash
curl -X PATCH http://localhost:8000/api/users/avatar \
  -b cookies.txt \
  -F "avatar=@/path/to/image.jpg"
```

- Allowed: JPEG, PNG, GIF, WEBP (<= 5MB)
- Auto-resized to 512x512 WEBP before storage
- Previous avatar is deleted (best effort)

---

### DELETE `/users/:id`

```bash
curl -X DELETE http://localhost:8000/api/users/<USER_ID> \
  -b cookies.txt
```

---

## 🔎 Error Shape (typical)

```jsonc
{
  "statusCode": 400,
  "message": "Invalid credentials",
  "error": "Bad Request",
}
```

Common errors: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

## 🧪 Notes for local testing

- Use `-c cookies.txt -b cookies.txt` with `curl` for routes that rely on cookies.
- Protected routes currently need the `access_token` cookie; Bearer-only calls
  are not yet accepted by `AuthGuard`.
- Default admin comes from seeder env: `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`.

---
