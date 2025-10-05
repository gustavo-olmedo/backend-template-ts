# 📡 API Reference

Base URL (dev): **http://localhost:8000/api**

Authentication:

- Most endpoints require a **Bearer access token** in `Authorization` header.
- `POST /refresh` and `POST /logout` rely on **HTTP-only cookies** set during login/SSO.
- `POST /login` returns `{ user, accessToken }` and also sets cookies for refresh.

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

**Response**: `200 OK` → `User` JSON.

---

### POST `/login`

Authenticate with email/password. Sets refresh cookie; returns access token.

```bash
curl -i -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt -b cookies.txt \
  -d '{ "email": "admin@mail.com", "password": "ChangeMe123!",
        "appInstanceId": "11111111-1111-1111-1111-111111111111",
        "platform": "web", "pushToken": null }'
```

**Response**: `200 OK` → `{ user, accessToken }`

---

### POST `/refresh`

Get a new access/refresh pair using refresh cookie.

```bash
curl -i -X POST http://localhost:8000/api/refresh \
  -c cookies.txt -b cookies.txt
```

**Response**: `200 OK` → `{ ok: true }` and sets new cookies.

---

### POST `/logout`

Revoke the current session and clear cookies.

```bash
curl -X POST http://localhost:8000/api/logout \
  -c cookies.txt -b cookies.txt
```

**Response**: `200 OK` → `{ message: "Success" }`

---

### POST `/forgot-password`

Issue a reset token and send email (no user existence leak).

```bash
curl -X POST http://localhost:8000/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "alice@mail.com" }'
```

**Response**: `200 OK` → `{ ok: true, message: "If that email exists, we sent a reset link." }`

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

**Response**: `200 OK` → `{ ok: true, message: "Password updated" }`

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

**Response**: `200 OK` → `{ user, accessToken }`

---

### GET `/user` _(Auth required)_

Current user profile.

```bash
curl http://localhost:8000/api/user \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 📱 Devices (Auth required)

### POST `/devices/register`

Register or upsert a device by `appInstanceId`.

```bash
curl -X POST http://localhost:8000/api/devices/register \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "appInstanceId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "platform": "web",
        "pushToken": null,
        "locale": "en-US",
        "timezone": "Europe/Lisbon" }'
```

**Response**: `200 OK` → `{ id: "<DEVICE_ID>" }`

---

### POST `/devices/heartbeat`

Mark device as seen now.

```bash
curl -X POST http://localhost:8000/api/devices/heartbeat \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "appInstanceId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }'
```

**Response**: `200 OK` → `{ ok: true }`

---

### PATCH `/devices/:id/token`

Update push token.

```bash
curl -X PATCH http://localhost:8000/api/devices/<DEVICE_ID>/token \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "pushToken": "NEW_TOKEN_OR_NULL" }'
```

**Response**: `200 OK` → `{ ok: true }`

---

### GET `/devices`

List current user's devices.

```bash
curl http://localhost:8000/api/devices \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### DELETE `/devices/:id`

Revoke a device.

```bash
curl -X DELETE http://localhost:8000/api/devices/<DEVICE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Response**: `200 OK` → `{ ok: true }`

---

## 🔐 Permissions (Auth required)

### GET `/permissions`

```bash
curl http://localhost:8000/api/permissions \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 🛡️ Roles (Auth required + permission: `roles`)

### GET `/roles`

```bash
curl http://localhost:8000/api/roles \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### GET `/roles/:id`

```bash
curl http://localhost:8000/api/roles/<ROLE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### POST `/roles`

Create a role with attached permissions.

```bash
curl -X POST http://localhost:8000/api/roles \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "moderator", "permissionIds": ["<PERMISSION_ID>"] }'
```

### PUT `/roles/:id`

Update a role.

```bash
curl -X PUT http://localhost:8000/api/roles/<ROLE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "moderator", "permissionIds": ["<PERMISSION_ID>"] }'
```

### DELETE `/roles/:id`

Soft-delete (deactivate) non-system roles.

```bash
curl -X DELETE http://localhost:8000/api/roles/<ROLE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 👥 Users (Auth required + permission: `users`)

### GET `/users` (paginated)

```bash
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### GET `/users/:id`

```bash
curl http://localhost:8000/api/users/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### POST `/users`

Create a user and send invite email with password token.

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "John", "lastName": "Smith",
        "email": "john@mail.com", "roleId": "<ROLE_ID>" }'
```

**Response**: `200 OK` → `User` JSON

---

### PUT `/users/:id`

Update user and role.

```bash
curl -X PUT http://localhost:8000/api/users/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "John", "lastName": "Smith",
        "email": "john.smith@mail.com", "roleId": "<ROLE_ID>" }'
```

---

### PATCH `/users/info`

Update the current user's profile.

```bash
curl -X PATCH http://localhost:8000/api/users/info \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "firstName": "Alice", "lastName": "Doe", "email": "alice@mail.com" }'
```

---

### PATCH `/users/password`

Change current user's password.

```bash
curl -X PATCH http://localhost:8000/api/users/password \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "password": "NewPassw0rd!", "passwordConfirm": "NewPassw0rd!" }'
```

> This triggers an `auth_identity` upsert for `provider="password"`.

---

### PATCH `/users/avatar`

Upload/replace avatar (`multipart/form-data`).

```bash
curl -X PATCH http://localhost:8000/api/users/avatar \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "avatar=@/path/to/image.jpg"
```

- Allowed: JPEG, PNG, GIF, WEBP (<= 5MB)
- Auto-resized to 512x512 WEBP before storage
- Previous avatar is deleted (best effort)

---

### DELETE `/users/:id`

```bash
curl -X DELETE http://localhost:8000/api/users/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
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
- Access tokens can be passed via `Authorization: Bearer <ACCESS_TOKEN>`.
- Default admin comes from seeder env: `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`.

---
