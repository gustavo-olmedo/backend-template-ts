# Authentication Data Model Overview

This document explains what **auth_identities**, **sessions**, and **devices** represent in the system and how they differ.

---

## `auth_identities` — How a user can authenticate

**Purpose:** The set of login methods linked to a user account (e.g., password, Google).  
**Cardinality:** One row per **user × provider**.

**Stores**

- `provider` — one of: `password`, `google`, `apple`, `github`.
- `providerUid` — **email** for `password`; **`sub`** (stable subject) for Google; similar stable IDs for other IdPs.
- `passwordHash` — present **only** when `provider='password'` and excluded from normal selects.
- `lastLoginAt` — timestamp of last successful sign-in with this provider.
- _(optional)_ `emailVerifiedAt` — when the IdP verified the email.

**Constraints (implemented)**

- `UNIQUE(provider, providerUid)` — prevents duplicate identities per provider.
- `UNIQUE(user, provider)` — at most one identity per provider per user.

**Notes**

- Password login keeps `providerUid` aligned with the user's current email,
  updates `lastLoginAt`, and can upgrade the bcrypt cost.
- The current Google flow first finds or creates a user by verified email, then
  upserts that user's Google identity using the provider `sub`.
- The model type includes `apple` and `github`, but only password and Google
  authentication endpoints are currently implemented.

---

## `sessions` — Where the user is currently logged in

**Purpose:** Tracks active logins (per device/browser profile). Used at **refresh** time.  
**Cardinality:** One row per **active login**.

**Stores**

- `refreshTokenHash` — hash of the refresh token (never store the raw token).
- `expiresAt` — when the session naturally expires.
- `revokedAt` — set when the session is invalidated (logout or a security action).
- `ip`, `userAgent` — context for security/auditing.
- _(optional)_ `device` — relation to a `devices` row.

**Lifecycle**

- Created at login/SSO.
- Read/validated during refresh (compare provided refresh token to hash).
- On refresh, the current controller rotates the hash and expiry on the same
  session so the `sid` remains valid.
- Revoked on logout or admin action.
- Short/medium-lived compared to devices and identities.

---

## `devices` — Installed app / browser instances

**Purpose:** Represents an install or browser profile; used for push notifications and “Your devices” UI.  
**Cardinality:** Many per user; long-lived.

**Stores**

- `appInstanceId` — stable random UUID kept in secure storage on the client.
- `platform` — `ios`, `android`, or `web`.
- `pushToken` and optional Web Push subscription fields.
- `locale`, `timezone`, `model`, `osVersion`, `appVersion`.
- `lastSeenAt`, `revokedAt`.

**Notes**

- Tokens can rotate; upsert on app start or when token changes.
- Login and Google SSO link new **sessions** to a device when
  `appInstanceId` is provided.

---

## How they differ (at a glance)

- **auth_identities** → _How can this user sign in?_  
  Long-lived; 1 row per user×provider; stores credentials/IdP linkage.

- **sessions** → _Where is this user logged in right now?_  
  Medium-lived; 1 row per login; stores refresh-token hash & revocation state.

- **devices** → _Which installs/browsers belong to this user?_  
  Long-lived; many per user; stores push token & device metadata.

---

## Practical flows

- **Register (password):** create `users` row + `auth_identity(password)` with `passwordHash`.
- **Login (password):** verify via `auth_identity(password)` → create `session` → (optional) attach `device` → set cookies/tokens → update `lastLoginAt` (and rehash if needed).
- **Login (SSO):** verify IdP → find/create user → `upsertSso(provider, providerUid)` → create `session` → (optional) attach `device` → set cookies/tokens.
- **Refresh:** validate refresh token vs `sessions.refreshTokenHash` → issue a
  replacement token pair → update the same session's hash and expiry.
- **Logout:** set `sessions.revokedAt` and clear both cookies.
- **Set/Reset password:** write/overwrite `auth_identity(password)` only (and optionally revoke other sessions).

---

## Implementation tips

- Use a centralized `BCRYPT_COST` (e.g., 12) and **lazy rehash** older password hashes when users log in.
- Prefer **provider stable IDs** (e.g., Google `sub`) for SSO linking instead of email.
- Add indexes on common queries:
  - `sessions(user, revokedAt, expiresAt)` is implemented.
  - `devices(user, revokedAt, lastSeenAt)` is implemented.
  - The two identity uniqueness constraints are implemented; add further
    indexes only after measuring actual query patterns.
