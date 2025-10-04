# End-to-End Authentication Flows

**Stack:** NestJS API · Next.js (App Router) · NextAuth (for SSO) · React Native (mobile)  
**Data model:** `users`, `auth_identities`, `sessions`, `devices`

This document explains how authentication works for:

- **Web – Email & Password**
- **Web – SSO via NextAuth (Google)**
- **Mobile – React Native (Email/Password & SSO exchange)**
- **Devices** — registration, heartbeat, and linking sessions to devices

> **Terminology (important)**
>
> - **Access token**: short-lived JWT (e.g., 10–20 min). Used on _every_ request (`jwt` cookie on web; `Authorization: Bearer` on mobile).
> - **Refresh token**: long-lived JWT (e.g., 30–60 days). Used only at `/api/refresh` to rotate tokens.
> - **Session row**: DB record with `id` (sid), `refresh_token_hash`, `expires_at`, `revoked_at`, `ip`, `user_agent`, optional `device_id`.
> - **Identity row**: DB record (`auth_identities`) per user×provider (password/google/...), stores `provider_uid`, `password_hash` (password only), `last_login_at`.
> - **Device row**: DB record (`devices`) per installed app/browser instance; holds push token + metadata (`platform`, `locale`, `last_seen_at`, ...).
>
> **Cookie names:** make them consistent across web: e.g., `jwt` for access and `refresh` for refresh. (Avoid mixing `refresh` vs `refresh_token`.)

---

## Shared Backend Behavior (NestJS)

- **Option 2 (DB‑generated session id)** issuance (at login or SSO exchange):

  1. **Insert** a shell session row to get DB `id` (sid).
  2. **Sign once**: access/refresh with that `sid`.
  3. **Update** the same row with `hash(refresh)`.
  4. **Set cookies** (web) or **return tokens in JSON** (mobile).

- **Refresh endpoint** (`POST /api/refresh`):

  - Accepts refresh token from **cookie** (web) or **Authorization: Bearer <refresh>** header (mobile).
  - Verifies JWT, checks DB hash & `revoked_at`, rotates tokens, updates stored hash, responds with **new access+refresh** (cookies for web, JSON for mobile).

- **Logout** (`POST /api/logout`):

  - Reads refresh token (cookie/header) to discover `sid`, sets `revoked_at`, clears cookies (web).

- **Auth guard**:

  - Verify **access** token from `jwt` cookie (web) or `Authorization: Bearer` header (mobile).
  - Optionally accept either cookie or header for flexibility.

- **Devices** (optional but recommended):
  - `POST /api/devices/register` — upsert by `(user, appInstanceId)`; update push token & metadata.
  - `POST /api/devices/heartbeat` — update `last_seen_at`.
  - `PATCH /api/devices/:id/token` — update/clear push token.
  - `GET /api/devices` — list user devices.
  - `DELETE /api/devices/:id` — soft revoke device (optionally revoke sessions linked to it).
  - On login/SSO, if client provides `appInstanceId`, **link** the new session to that `device_id`.

> **CORS** (only for browser-to-API calls): enable `origin` for your web host(s) and `credentials: true` when using cookies across origins.

---

## 1) Web – Email & Password

### Sign-in

**Request**

```
POST /api/login
Content-Type: application/json

{
  "email": "user@mail.com",
  "password": "••••••••",
  // optional device fields to attach session to device
  "appInstanceId": "7e9f2f3b-...",
  "platform": "web",
  "pushToken": null,
  "locale": "en-US",
  "timezone": "Europe/Lisbon"
}
```

**Backend flow**

1. Lookup user by email; verify password via `auth_identities(provider='password')` (bcrypt compare).
2. `touchPasswordLogin` (optional): backfill identity if missing, update `last_login_at`, upgrade bcrypt cost if increased.
3. (Optional) Upsert device by `(user, appInstanceId)`; keep the resulting `device_id` for the session.
4. **Issue session** (DB‑generated id):
   - Insert shell session → get `sid`.
   - Sign **access** (short) & **refresh** (long) once with `sid`.
   - Update session with `hash(refresh)` and `device_id` (if any).
5. **Set httpOnly cookies** on the web domain: `jwt` (access), `refresh` (refresh).

**Response**

```json
{
  "user": {
    /* profile */
  },
  "accessToken": "<ACCESS_JWT>"
}
```

> The browser will rely on cookies for API calls; the body is optional convenience.

### Authenticated requests

- Browser sends `Cookie: jwt=...` automatically.
- Guard verifies access and authorizes.

### Refresh

- On 401 or proactive logic, call `POST /api/refresh` (cookies are sent automatically).
- API validates, rotates, and **sets new cookies**.

### Logout

```
POST /api/logout
```

- Backend revokes the session (`revoked_at=now()`), clears cookies.

---

## 2) Web – SSO via NextAuth (Google)

### Sign-in

1. User clicks “Continue with Google” → NextAuth performs OAuth.
2. NextAuth `callbacks.signIn` receives `account.id_token`.
3. NextAuth **exchanges** with backend:
   ```
   POST ${BACKEND}/api/sso/google
   { "idToken": "<GOOGLE_ID_TOKEN>" }
   ```
4. Backend verifies Google ID token, finds/creates user, **issues session** (same as password flow), and **sets cookies** in the backend response.
5. In the NextAuth callback, **mirror** backend cookies to the browser:
   - Parse upstream `Set-Cookie` headers.
   - Set **both** `jwt` and `refresh` cookies on the web domain.

> Ensure the Google OAuth Client has the **exact** redirect URI `https://your-site/api/auth/callback/google` in Google Cloud Console.

Everything else (requests, refresh, logout) is identical to email/password because the **backend session** is authoritative.

---

## 3) Mobile – React Native

### Storage & headers

- Store tokens in **secure storage** (Keychain / EncryptedSharedPreferences / `expo-secure-store`).
- Send **`Authorization: Bearer <access>`** on each API request.
- Refresh uses **`Authorization: Bearer <refresh>`** (or a dedicated header) since cookies are not used.

### Email & Password

**Login**

```
POST ${API}/api/login
{ "email": "...", "password": "...", "appInstanceId": "<Id>", "platform": "ios|android" }
```

**Response**

```json
{
  "user": {
    /* profile */
  },
  "accessToken": "<ACCESS_JWT>",
  "refreshToken": "<REFRESH_JWT>"
}
```

- Save both tokens securely.
- Optionally call `POST /api/devices/register` to register/refresh the push token & metadata.
- Include `appInstanceId` in login to link the new session to the device.

**Authenticated request**

```
GET ${API}/api/user
Authorization: Bearer <ACCESS_JWT>
```

**Refresh**

```
POST ${API}/api/refresh
Authorization: Bearer <REFRESH_JWT>
```

- API validates vs `sessions.refresh_token_hash`, rotates tokens, returns **new access+refresh** in JSON.
- Replace stored tokens and retry the original request.

**Logout**

```
POST ${API}/api/logout
Authorization: Bearer <REFRESH_OR_ACCESS_JWT>
```

- Revoke session on server; delete tokens from secure storage.

### Mobile SSO

- Use native/Expo auth to obtain a **Google ID token** (PKCE recommended).
- Exchange with backend:
  ```
  POST ${API}/api/sso/google
  { "idToken": "<GOOGLE_ID_TOKEN>", "appInstanceId": "<Id>", "platform": "ios|android" }
  ```
- Backend issues session and returns access+refresh in JSON.
- Store tokens securely.

---

## Devices Integration

### Schema (essentials)

- `id` (id), `user_id`, `app_instance_id` (id), `platform` (`ios|android|web`),  
  `push_token` (or WebPush subscription fields), `locale`, `timezone`, `model`, `os_version`, `app_version`,  
  `last_seen_at`, `revoked_at`.

### API

- `POST /api/devices/register` — upsert by `(user, appInstanceId)`; update push token & metadata; set `last_seen_at=now()`; returns `device_id`.
- `POST /api/devices/heartbeat` — `{ appInstanceId }` → updates `last_seen_at`.
- `PATCH /api/devices/:id/token` — replace/clear push token.
- `GET /api/devices` — list devices for the current user.
- `DELETE /api/devices/:id` — soft revoke device; optionally revoke sessions linked to it.

### Link session → device (on login/SSO)

- If request included `appInstanceId`, resolve device and set `session.device_id` when inserting the session row.
- “Log out this device” UI can revoke all sessions with that `device_id`.

---

## Error Handling & Security Notes

- Rate-limit: `/api/login`, `/api/sso/*`, `/api/refresh`, `/api/forgot-password`.
- On password change, consider bumping a `tokenVersion` claim and revoking/forcing refresh.
- Always store **hash(refresh)**, never the raw string.
- For mobile refresh, ensure the backend accepts **Bearer refresh** (header) in addition to cookies.
- Align **TTL**: access ~15m; refresh 30–60d; rotate on each refresh for sliding sessions.
- Keep cookie flags: `httpOnly`, `sameSite=lax`, `secure` in production; path `/`.
- CORS only when the browser calls the API directly across origins; server-to-server Next → Nest needs none.

---

## Quick Checklists

### Web (Email/Password)

- [ ] `/api/login` creates session, sets `jwt` + `refresh` cookies.
- [ ] Guard reads `jwt` cookie; `/api/refresh` rotates cookies.
- [ ] `/api/logout` revokes session and clears cookies.
- [ ] (Optional) Attach session to device if `appInstanceId` present.

### Web (SSO via NextAuth)

- [ ] NextAuth has Google redirect URI registered in Google Cloud Console.
- [ ] `callbacks.signIn` exchanges `account.id_token` with backend at `/api/sso/google`.
- [ ] Mirror **both** `jwt` and `refresh` cookies to the browser in the callback.
- [ ] Everything else identical to email/password flow.

### Mobile (React Native)

- [ ] Store tokens in secure storage; send Bearer access on each request.
- [ ] `POST /api/refresh` accepts **Bearer refresh**; returns new tokens (JSON).
- [ ] Register/heartbeat devices; update push tokens when they rotate.
- [ ] Include `appInstanceId` at login/SSO to attach session to device.
