# End-to-End Authentication Flows

This document describes the authentication behavior currently implemented by
the NestJS API. The main data models are `users`, `auth_identities`, `sessions`,
and `devices`.

## Token and cookie model

- Access tokens expire after 15 minutes.
- Refresh tokens expire after 30 days.
- JWTs contain `sub` (user ID), `sid` (session ID), and `typ` (token type).
- Login and Google SSO set the HTTP-only `access_token` and `refresh_token`
  cookies with `SameSite=Lax`, path `/`, and `Secure` in production.
- Login and Google SSO return `{ user, accessToken }`; they do not return the
  refresh token in JSON.
- The current `AuthGuard` reads the access token from the cookie named by
  `AUTH_COOKIE_NAME`. Bearer-only authentication is not yet supported by that
  guard.
- Refresh and logout currently read `refresh_token` from the cookie.

For the default configuration:

```env
AUTH_COOKIE_NAME=access_token
AUTH_REFRESH_COOKIE_NAME=refresh_token
```

## Shared session issuance

Password login and Google SSO use the same session flow:

1. Optionally upsert a device when `appInstanceId` is present.
2. Insert a shell session to obtain its database-generated `id` (`sid`).
3. Sign one access token and one refresh token containing that `sid`.
4. Hash the refresh token and update the shell session.
5. Set both cookies and return `{ user, accessToken }`.

The session stores its user, refresh-token hash, expiry, optional IP and user
agent, revocation timestamp, and optional device relation.

## Web: email and password

### Register

```http
POST /api/register
Content-Type: application/json

{
  "firstName": "Alice",
  "lastName": "Doe",
  "email": "alice@example.com",
  "password": "Password123!",
  "passwordConfirm": "Password123!"
}
```

The API creates a user with the `regular` role and stores the password hash in
an `auth_identities` row with provider `password`.

### Login

```http
POST /api/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "Password123!",
  "appInstanceId": "11111111-1111-1111-1111-111111111111",
  "platform": "web",
  "pushToken": "optional-token",
  "locale": "en-US",
  "timezone": "Europe/Lisbon"
}
```

Only `email` and `password` are required. Device fields are optional. On a
successful login, the API verifies the password identity, updates its last
login information, creates a session, and sets both authentication cookies.

```json
{
  "user": {},
  "accessToken": "<ACCESS_JWT>"
}
```

### Authenticated requests

Browsers send `access_token` automatically when requests include credentials.
The route-level `AuthGuard` verifies it and puts `sub` into `request.userId`.
The global permissions guard then loads the user and role permissions.

### Refresh

```http
POST /api/token/refresh
Cookie: refresh_token=<REFRESH_JWT>
```

The endpoint verifies the refresh JWT and stored session hash, issues a new
token pair with the same `sid`, updates that session's refresh hash and expiry,
sets both cookies, and returns:

```json
{ "ok": true }
```

### Logout

```http
POST /api/logout
Cookie: refresh_token=<REFRESH_JWT>
```

When the refresh token contains a session ID, the API revokes that session. It
always clears both authentication cookies and returns `{ "message": "Success" }`.

## Web: Google SSO

```http
POST /api/sso/google
Content-Type: application/json

{
  "idToken": "<GOOGLE_ID_TOKEN>",
  "appInstanceId": "22222222-2222-2222-2222-222222222222",
  "platform": "web"
}
```

The backend verifies the ID token against `GOOGLE_CLIENT_ID`, requires a
verified email, finds or creates the local user, and upserts a Google identity
using the Google `sub`. It then follows the shared session issuance flow.

If NextAuth performs the Google OAuth flow, the server-side integration must
forward the backend's `Set-Cookie` headers to the browser. Configure the exact
NextAuth callback URL in Google Cloud Console.

## Password invitation and reset

- `POST /api/users` creates a user, issues an `invite` token, and emails a link
  built from `PUBLIC_FE_APP_URL`.
- `POST /api/forgot-password` always returns the same success response so it
  does not reveal whether an email exists.
- `POST /api/set-password` accepts `type: "invite" | "reset"`, validates and
  consumes the token, and upserts the password identity.
- `PATCH /api/users/password` updates the authenticated user's password
  identity.

Password tokens are stored as SHA-256 hashes, expire after 48 hours by default, and are
single-use.

## Devices

### Supported routes

- `POST /api/devices/register` upserts by `(user, appInstanceId)` and updates
  metadata and `lastSeenAt`.
- `POST /api/devices/heartbeat` updates `lastSeenAt`.
- `PATCH /api/devices/:id/token` replaces or clears the push token and rejects
  revoked devices.
- `GET /api/devices` lists non-revoked devices, newest activity first.
- `DELETE /api/devices/:id` sets `revokedAt`.

`appInstanceId` must be a UUID. Supported platforms are `ios`, `android`, and
`web`. The default device list limit is 50.

When login or Google SSO includes `appInstanceId`, the resulting device is
attached to the new session.

## Mobile status

The DTOs accept `ios` and `android`, and `AuthService.getUserId` can extract a
Bearer access token. However, mobile token authentication is not complete:

- `AuthGuard` still requires the access cookie.
- Refresh and logout read the refresh cookie rather than a Bearer token.
- Login and Google SSO do not return `refreshToken` in JSON.

Until those three contracts are implemented, native clients need cookie
handling or a backend update; they cannot rely on the previously proposed
Bearer-only flow.

## Security and deployment notes

- Keep `JWT_SECRET` strong and private.
- Keep `BCRYPT_COST` appropriate for the deployment environment; the default
  fallback is 12.
- Never store raw refresh tokens or password-reset tokens in the database.
- Configure an explicit CORS origin when sending credentialed browser requests.
  The current `origin: '*'` setting in `main.ts` should be tightened before
  production.
- Rate limiting is configured globally at 10 requests per 60 seconds, with the
  avatar endpoint limited to 5 requests per 60 seconds.
