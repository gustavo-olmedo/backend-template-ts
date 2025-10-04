# Authentication Data Model Overview

This document explains what **auth_identities**, **sessions**, and **devices** represent in the system and how they differ.

---

## `auth_identities` — How a user can authenticate
**Purpose:** The set of login methods linked to a user account (e.g., password, Google).  
**Cardinality:** One row per **user × provider**.

**Stores**
- `provider` — one of: `password`, `google`, `apple`, `github`.
- `provider_uid` — **email** for `password`; **`sub`** (stable subject) for Google; similar stable IDs for other IdPs.
- `password_hash` — present **only** when `provider='password'`.
- `last_login_at` — timestamp of last successful sign-in with this provider.
- *(optional)* `email_verified_at` — when the IdP verified the email.

**Constraints (recommended)**
- `UNIQUE(provider, provider_uid)` — prevents duplicate identities per provider.
- `UNIQUE(user, provider)` — at most one identity per provider per user.

**Notes**
- Keep `provider_uid` in sync if the user’s email changes (for `password`).
- On password login, you may **rehash** if you increase bcrypt cost and update `last_login_at`.
- On SSO, **lookup by (provider, provider_uid)** first; if not found and `email_verified=true`, optionally link to an existing user by email.

---

## `sessions` — Where the user is currently logged in
**Purpose:** Tracks active logins (per device/browser profile). Used at **refresh** time.  
**Cardinality:** One row per **active login**.

**Stores**
- `refresh_token_hash` — hash of the refresh token (never store the raw token).
- `expires_at` — when the session naturally expires.
- `revoked_at` — set when the session is invalidated (logout, security action).
- `ip`, `user_agent` — context for security/auditing.
- *(optional)* `device_id` — link to a `devices` row for “log out this device”.

**Lifecycle**
- Created at login/SSO.
- Read/validated during refresh (compare provided refresh token to hash).
- Rotated (hash updated) on successful refresh.
- Revoked on logout or admin action.
- Short/medium-lived compared to devices and identities.

---

## `devices` — Installed app / browser instances
**Purpose:** Represents an install or browser profile; used for push notifications and “Your devices” UI.  
**Cardinality:** Many per user; long-lived.

**Stores**
- `app_instance_id` — stable random UUID kept in secure storage on the client.
- `platform` — `ios`, `android`, or `web`.
- `push_token` (and/or Web Push subscription fields).
- `locale`, `timezone`, `model`, `os_version`, `app_version`.
- `last_seen_at`, `revoked_at`.

**Notes**
- Tokens can rotate; upsert on app start or when token changes.
- Optionally link new **sessions** to a **device** (by `app_instance_id`) during login/SSO.

---

## How they differ (at a glance)

- **auth_identities** → *How can this user sign in?*  
  Long-lived; 1 row per user×provider; stores credentials/IdP linkage.

- **sessions** → *Where is this user logged in right now?*  
  Medium-lived; 1 row per login; stores refresh-token hash & revocation state.

- **devices** → *Which installs/browsers belong to this user?*  
  Long-lived; many per user; stores push token & device metadata.

---

## Practical flows

- **Register (password):** create `users` row + `auth_identity(password)` with `password_hash`.
- **Login (password):** verify via `auth_identity(password)` → create `session` → (optional) attach `device` → set cookies/tokens → update `last_login_at` (and rehash if needed).
- **Login (SSO):** verify IdP → find/create user → `upsertSso(provider, provider_uid)` → create `session` → (optional) attach `device` → set cookies/tokens.
- **Refresh:** validate refresh token vs `sessions.refresh_token_hash` → rotate tokens → update hash.
- **Logout:** set `sessions.revoked_at` and clear cookies/tokens.
- **Set/Reset password:** write/overwrite `auth_identity(password)` only (and optionally revoke other sessions).

---

## Implementation tips
- Use a centralized `BCRYPT_COST` (e.g., 12) and **lazy rehash** older password hashes when users log in.
- Prefer **provider stable IDs** (e.g., Google `sub`) for SSO linking instead of email.
- Add indexes on common queries:  
  - `sessions(user_id, revoked_at, expires_at)`  
  - `devices(user_id, last_seen_at)`  
  - `auth_identities(provider, provider_uid)` and `(user_id, provider)`.
