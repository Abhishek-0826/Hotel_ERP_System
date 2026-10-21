# ROOST – Local Setup & Production Deployment Guide

Stack: **React/Vite frontend** → **Express/Prisma API** → **Supabase** (Postgres + Auth).
Production: frontend on **Vercel**, API on **Render**, database + auth on **Supabase**.

```
Browser ──► Vercel (static React app)
   │  ├─ sign up / sign in / reset password ──► Supabase Auth  (returns a signed access token)
   │  └─ /api/v1/... + "Authorization: Bearer <token>" ──► Render (Express API)
   │                                                           ├─ verifies the token (Supabase public keys)
   │                                                           └─ reads/writes Postgres (Supabase, via pooler)
```


---

## Part 0 – Your Supabase project: what was found

Project ref `fpccdjzhsprfsmgrizly` → URL `https://fpccdjzhsprfsmgrizly.supabase.co`. Checked against the live project:

| Finding | What it means |
|---|---|
| Signing key is **ES256** (asymmetric, JWKS published) | The API verifies Supabase tokens with the public key from `…/auth/v1/.well-known/jwks.json`. No JWT secret has to be copied anywhere. |
| **Email sign-in on, "Confirm email" on** (`mailer_autoconfirm: false`) | New users must click an emailed link before they can sign in. Keep this on – the API relies on it (see §A.4). |
| Database was reset (Oct 2026) and rebuilt from the Prisma migration `0001_init` | Schema, constraints, default settings and Row Level Security are all in place. Prisma is the only schema tool now (no Flyway). See §1.4 to rebuild it at any time. |
| Row Level Security is enabled on every table | The publishable key in the frontend cannot read or write any data through Supabase's REST API; only your API (which connects as `postgres`) can. Re-run §1.3 after adding tables. |
| `users` table currently has 0 rows | Clean start: no data migration needed. |

### Do I need the Session pooler, or can I connect directly?

| | Direct connection (`db.<ref>.supabase.co:5432`) | Session pooler (`aws-0-<region>.pooler.supabase.com:5432`) |
|---|---|---|
| Network | **IPv6 only** (IPv4 needs a paid add-on) | IPv4 **and** IPv6 |
| Works from Render | **No** – Render has no outbound IPv6 | **Yes** |
| Works from your PC | Only if your ISP/router gives you IPv6 | Yes |
| Prisma migrations | Yes | Yes |
| Many short-lived connections | Limited | Supported |

**Answer: use the Session pooler for everything.** It is required for Render, and it is the one string that works on every machine. Direct works locally *only* if you have IPv6; don't rely on it. (The Transaction pooler, port 6543, is for serverless; it breaks Prisma migrations – don't use it here.)

---

## Part A – How login works now (and why there is a JWT)

### A.1 What a JWT is, and why this project used one
HTTP is stateless: after you log in, every later request must prove who you are. A **JSON Web Token** is a small signed string containing claims (`userId`, `role`, `tenantId`, expiry). The server signs it once at login; for every request it only checks the signature – **no database lookup or server-side session store is needed**. That is why the original API used JWTs: the frontend stores the token and sends it as `Authorization: Bearer <token>`, and the API (`JWT_SECRET` signs/verifies it) knows the caller's role and property without extra state. It works well for a stateless API on Render.

### A.2 What changed with Supabase Auth
Supabase Auth is *also* JWT-based, so the Bearer-token model stays. What moves out of this codebase:

| Concern | Before (own JWT) | Now (Supabase Auth) |
|---|---|---|
| Sign up / sign in | `POST /auth/register`, `/auth/login` with bcrypt in our code | Supabase (`supabase.auth.signUp / signInWithPassword`) |
| Email confirmation | none | Supabase sends the email |
| Forgot / reset password | stub that stored a token but never emailed it | Supabase emails a reset link → `/reset-password` page |
| Token signing | our `JWT_SECRET` (HS256) | Supabase private key (ES256); we only hold the **public** key |
| Token refresh | none (7-day token) | automatic (short-lived access token + refresh token) |
| Password hashing, brute-force/rate limits, breached-password checks | our code | Supabase |
| **Roles & property (tenant)** | in token, from `users` table | **still in our `users` table** (see A.3) |

### A.3 Roles stay in your database (important)
Supabase proves *who* someone is. *What they may do* (GUEST / OWNER / STAFF / PLATFORM_ADMIN, which property) stays in the `users` table. The API:
1. verifies the token's signature, issuer and audience;
2. finds the `users` row by `auth_user_id` (a nullable `uuid` column on `users`), or on first login links the row with the same email;
3. if no row exists and the call is `GET /auth/me`, creates a **GUEST** row (this is how a normal sign-up becomes a ROOST user);
4. uses the role/tenant **from the database** on every request.

Roles are deliberately **not** read from `user_metadata`, because users can edit that themselves.

### A.4 Why "Confirm email" must stay on
Linking by email is only safe if whoever holds a token for `owner@x.com` really controls that inbox. With confirmation on, Supabase only issues tokens after the link is clicked. If you turned it off, anyone could sign up as someone else's email and inherit their role.

### A.5 Auth modes (`AUTH_MODE` on the API)
| Mode | Accepts | Use when |
|---|---|---|
| `supabase` (**recommended**, example default) | Supabase tokens only. Old `/auth/login`, `/register`, `/forgot-password`, `/change-password`, `/admin/login` return `AUTH_HANDLED_BY_SUPABASE`. `JWT_SECRET` not needed. | New/empty database (yours) |
| `hybrid` | Supabase tokens **and** old API-issued tokens | You already have users with passwords in the DB and are migrating |
| `legacy` | Old tokens only | Debugging / emergency rollback |

On the frontend, Supabase login is used automatically when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set; otherwise the old login screens' API calls are used.

### A.6 Staff/owner accounts created by an admin
Admins create staff/owners from the app (`POST /management/users`). Two options:
- **With `SUPABASE_SERVICE_ROLE_KEY` set on the API:** the API creates the Supabase login (already confirmed) with the given password and links it. Admin "reset password" also changes it in Supabase.
- **Without it:** the profile row is created; the person opens the app, uses **Forgot password** with that email, sets a password, and is linked on first sign-in.

The service-role/secret key is a **server-only** secret (Render env var). Never put it in Vercel/the frontend.

---

## Part 1 – Run locally (UI + API + Supabase)

### 1.1 Prerequisites
Node.js 20+, npm, Git. Your Supabase project already exists.

### 1.2 Supabase dashboard settings (one time)
1. **Connection string** – click **Connect** → **Session pooler** → copy the URI (host `aws-0-<region>.pooler.supabase.com`, port **5432**, user `postgres.fpccdjzhsprfsmgrizly`). Put your DB password in place of `[YOUR-PASSWORD]` (URL-encode special characters: `@`→`%40`, `#`→`%23`, `/`→`%2F`). Forgotten password: Project Settings → Database → Reset database password.
2. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: add `http://localhost:5173/**`
   (Without this, confirmation/reset links are rejected.)
3. **Authentication → Sign In / Providers → Email** – set **Minimum password length to 12** (the app's forms require 12) and keep **Confirm email** on.
4. **Emails** – Supabase's built-in mailer is for testing only (a few emails/hour, may land in spam). Fine locally; for production configure custom SMTP (§2.1).

### 1.3 Lock down the public REST API (do this first)
In Supabase → **SQL Editor** → New query → run:
```sql
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
```
RLS with no policies = the publishable key can read/write nothing. Your API is unaffected because it connects as the `postgres` role, which bypasses RLS. Verify:
```sh
curl -H "apikey: <publishable key>" "https://fpccdjzhsprfsmgrizly.supabase.co/rest/v1/users?select=id&limit=1"
```
should return `[]` or a permission error, never data. Re-run the SQL after future migrations that add tables.

### 1.4 Install and prepare the database
```sh
npm run install:all          # installs both apps; generates the Prisma client
```
Create `backend/.env` (`Copy-Item backend/.env.example backend/.env`) and set:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres.fpccdjzhsprfsmgrizly:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
DB_SSL=true
AUTH_MODE=supabase
SUPABASE_URL=https://fpccdjzhsprfsmgrizly.supabase.co
CORS_ORIGINS=http://localhost:5173
BASE_URL=http://localhost:5000
PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
PUBLIC_APP_URL=http://localhost:5173
SUPABASE_SERVICE_ROLE_KEY=<secret key, needed for owner invites / logo storage / staff logins>
```
Rules: no `?sslmode=` on `DATABASE_URL` (it overrides `DB_SSL` and fails against Supabase certificates). `JWT_SECRET` is not needed in `supabase` mode. `SUPABASE_SERVICE_ROLE_KEY` is optional (§A.6).

**Create the schema** (fresh Supabase database). From `backend/`:
```sh
cd backend
npx prisma migrate deploy
```
`0001_init` creates all 22 tables plus the rules Prisma cannot express (no double-booking constraint, allowed-value CHECK constraints, platform default settings). Then run the RLS SQL (§1.3). Verify: `npx prisma migrate status` says "Database schema is up to date!".

**Start over / reset the database.** Destroys all data – only for development. In Supabase → SQL Editor:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
```
then `npx prisma migrate deploy` and the RLS SQL again. Also delete users in Supabase → Authentication → Users if you want a clean login list.

**Changing the schema later:** edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <change>` against a *development* database (not production), commit the new folder in `prisma/migrations`, then run `npx prisma migrate deploy` against production.

### 1.5 Create your first logins
ROOST is multi-tenant: hotels live at `/<hotel-slug>`, and only the platform admin (you) can create hotels. **Follow [HOTEL_ONBOARDING_AND_TESTING_GUIDE.md](HOTEL_ONBOARDING_AND_TESTING_GUIDE.md)** – it covers creating the platform admin, the two test hotels, owner invitations and the full test plan.

Use `node scripts/create-test-hotel.js <ownerEmail> sunrise-test` for a ready-made hotel with rooms and beds.

### 1.6 Configure the frontend
`frontend/.env` was created for you (git-ignored) with:
```env
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://localhost:5000
VITE_PUBLIC_APP_URL=http://localhost:5173
VITE_USE_DEMO_DATA=false
VITE_SUPABASE_URL=https://fpccdjzhsprfsmgrizly.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```
Locally, the browser calls `/api/v1/…` on `localhost:5173` and Vite proxies it to `localhost:5000` (no CORS). Supabase Auth is called directly from the browser. Restart Vite after editing `.env`.

### 1.7 Start both servers (two terminals, repo root)
```sh
npm run dev:backend      # API   → http://localhost:5000
npm run dev:frontend     # UI    → http://localhost:5173
```

### 1.8 Verify the integration
1. `http://localhost:5000/api/v1/health` → `{"success":true,"status":"ok"}`; `http://localhost:5000/api-docs` shows the API docs.
2. UI → **Sign up** → "Check your email" → click link → sign in → you reach the guest dashboard.
3. DevTools → Network: `/api/v1/auth/me` returns 200 with your profile; a row appears in Supabase **Table Editor → users** with `auth_user_id` filled.
4. **Forgot password** → email arrives → link opens `/reset-password` → set a 12+ char password → sign in with it.
5. Wrong password → "Invalid login credentials".

### 1.9 Local troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot find module '.prisma/client/default'` | `cd backend && npx prisma generate` |
| `SUPABASE_URL is required unless AUTH_MODE=legacy` | Add `SUPABASE_URL` to `backend/.env` |
| `Missing required env var: JWT_SECRET` | You're in `hybrid`/`legacy` mode: set `JWT_SECRET` or use `AUTH_MODE=supabase` |
| `ENOTFOUND` / `ENETUNREACH` to `db.…supabase.co` | You used the direct host; use the Session pooler string |
| `self-signed certificate in certificate chain` | Remove `sslmode` from `DATABASE_URL`; set `DB_SSL=true` |
| `no pg_hba.conf entry … no encryption` | `DB_SSL=true` missing |
| `password authentication failed` / `Tenant or user not found` | Wrong password, un-encoded special chars, or wrong pooler host/region – recopy from Connect |
| `P3005` "database schema is not empty" | The database already has tables: use the reset SQL in §1.4 (development only) |
| Sign-up works, no email | Built-in mailer limit/spam folder; check Supabase → Authentication → Logs, or configure SMTP |
| Link in email goes to wrong site / "redirect not allowed" | Fix Site URL + Redirect URLs (§1.2) |
| Login OK in Supabase but app shows `ACCOUNT_NOT_PROVISIONED` (403) | The first call after login must be `GET /auth/me` (the UI does this); sign out/in |
| `AUTH_LINK_CONFLICT` (409) | The email's `users` row is already linked to a different Supabase account; fix `auth_user_id` in the table |
| 401 `TOKEN_INVALID` on every call | API `SUPABASE_URL` differs from the project the frontend signs into |
| Browser CORS error | `CORS_ORIGINS` must exactly match the page origin (no trailing `/`) |
| Edit-profile email field is read-only | By design: change email via Supabase, not the profile form |
| Rate-limited (429) | Login endpoints allow 20 attempts/15 min per IP |

---

## Part 2 – Production: Supabase + Render + Vercel

Order: **Supabase → Render → Vercel → back to Supabase & Render to cross-link URLs.**

### 2.0 Pre-flight
- [ ] Code is on GitHub; `git ls-files | grep "\.env"` lists only `.env.example` files.
- [ ] If any real `.env` was ever committed (history shows "supabase config" commits), **rotate** the DB password and any keys in it.
- [ ] Decide: use this Supabase project for production (its dashboard badge already says PRODUCTION).

### 2.1 Supabase (production)
1. Create the schema and enable RLS (§1.3, §1.4) on the production project. From your PC:
   ```powershell
   cd backend
   $env:DATABASE_URL="<session pooler uri>"; npx prisma migrate deploy
   ```
2. **Custom SMTP** (needed for real users): Authentication → Emails → SMTP Settings → enable custom SMTP (Resend, SendGrid, Brevo, Amazon SES, …) with a verified sender domain. The built-in mailer is throttled and unsuitable for production.
3. **Authentication → URL Configuration** (after Vercel gives you a URL – §2.4): Site URL = `https://<your-app>.vercel.app` (or custom domain); Redirect URLs = that URL with `/**`, keep `http://localhost:5173/**` for development.
4. **Email template** (optional): Authentication → Emails → customise "Confirm signup" and "Reset password" text/branding.
5. **Security**: Authentication → Attack Protection → enable CAPTCHA (Turnstile/hCaptcha) if you see sign-up abuse; keep "Prevent use of leaked passwords" on (paid plan).
6. **Backups**: free plan has none – export periodically, or upgrade for daily backups/PITR.
7. **Create the platform admin**: Supabase → Authentication → Users → Add user (auto-confirm), then locally:
   ```powershell
   $env:DATABASE_URL="<session pooler uri>"; $env:DB_SSL="true"; node scripts/make-admin.js you@gmail.com
   ```
   Sign in at `https://<app>/platform/login` and add hotels (see the hotel onboarding guide).
8. Optional – **service-role/secret key** for admin-created staff: Project Settings → API Keys → *Secret key* (or legacy `service_role`). Only goes to Render.

### 2.2 Render (API)
1. render.com → **New + → Web Service** → connect the GitHub repo.

   | Field | Value |
   |---|---|
   | Name / Region | `roost-api` / same region as Supabase |
   | Root Directory | `backend` |
   | Build Command | `npm ci` (runs `postinstall` → `prisma generate`) |
   | Start Command | `npm start` |
   | Health Check Path | `/api/v1/health` |
   | Instance | Free (sleeps after ~15 min idle; first request ~30–60 s) or Starter (always on) |

2. **Environment variables**

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Session pooler URI, port 5432, **no `sslmode`** |
   | `DB_SSL` | `true` |
   | `DB_POOL_MAX` | `5` |
   | `AUTH_MODE` | `supabase` |
   | `SUPABASE_URL` | `https://fpccdjzhsprfsmgrizly.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret key – needed for owner invites, staff logins and logo storage (§A.6) |
   | `PUBLIC_APP_URL` | `https://<your-app>.vercel.app` (used inside invite emails) |
   | `CORS_ORIGINS` | placeholder now, e.g. `http://localhost:5173`; set to the Vercel URL in §2.4 |
   | `BASE_URL` | `https://roost-api.onrender.com` |
   | `PUBLIC_API_BASE_URL` | `https://roost-api.onrender.com/api/v1` |

   Don't set `PORT` (Render injects it). `JWT_SECRET` is not needed in `supabase` mode.
3. Deploy; wait for `"event":"server_started"` in the logs. Open `https://roost-api.onrender.com/api/v1/health`.

### 2.3 Vercel (frontend)
1. vercel.com → **Add New → Project** → import the repo.

   | Field | Value |
   |---|---|
   | Framework | Vite |
   | Root Directory | `frontend` |
   | Install / Build / Output | `npm ci` / `npm run build` / `dist` |

2. **Environment variables** (Production, and Preview if you use previews):

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://roost-api.onrender.com/api/v1` |
   | `VITE_SUPABASE_URL` | `https://fpccdjzhsprfsmgrizly.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (public by design) |
   | `VITE_PUBLIC_APP_URL` | `https://<your-app>.vercel.app` |
   | `VITE_USE_DEMO_DATA` | `false` |
   | `VITE_API_TIMEOUT_MS` | `15000` (use `60000` on Render free tier) |

   `VITE_*` values are baked in at build time – redeploy after changing any. Do **not** add the secret/service-role key here.
3. Deploy. `frontend/vercel.json` rewrites every path to `index.html`, so deep links and `/reset-password` work.

### 2.4 Cross-link the three services (don't skip)
1. **Render** → `CORS_ORIGINS=https://<your-app>.vercel.app` (comma-separate multiple origins, no trailing slash) → saves and redeploys.
2. **Supabase** → Authentication → URL Configuration → Site URL and Redirect URLs = your Vercel URL (§2.1 step 3). Without this, confirmation and reset emails link to localhost or are rejected.
3. Custom domain later: update all three places plus `VITE_PUBLIC_APP_URL`, `BASE_URL`, `PUBLIC_API_BASE_URL`, then redeploy.

### 2.5 Production smoke test
1. `https://<app>/platform/login` → sign in as the platform admin → **Add hotel** (invite mode) for a test hotel.
2. Open the invitation email → set password → sign in at `https://<app>/<slug>/login` → complete the hotel setup → add a property, room and beds.
3. Network tab: calls go to `https://roost-api.onrender.com/api/v1/…` with 200s and an `X-Tenant-Slug` header.
4. In a private window open `https://<app>/<slug>` → sign up as a guest → confirm → book a bed → confirm it as the owner.
5. **Forgot password** end to end; refresh on a deep route – it still loads.

The full checklist (isolation, suspension, team roles) is in [HOTEL_ONBOARDING_AND_TESTING_GUIDE.md](HOTEL_ONBOARDING_AND_TESTING_GUIDE.md).

### 2.6 Day-2 operations
- **Deploys**: pushing to the connected branch redeploys Render and Vercel.
- **Schema changes**: add a Prisma migration, commit, run `npx prisma migrate deploy` against production (§2.1), re-run the RLS SQL if tables were added. Never run `migrate dev`/`migrate reset` against production.
- **Rollback**: Render and Vercel keep previous deploys; DB changes are not rolled back.
- **Logs**: Render → Logs; Supabase → Authentication → Logs (sign-ups, email delivery); Vercel → Deployments.
- **Suspending a user**: set `users.status` to something other than `ACTIVE` – the API rejects them on the next request (their Supabase token stays valid but is useless). Also ban them in Supabase → Authentication → Users to block sign-in.
- **Uptime on Render free tier**: ping `/api/v1/health` every 5 min with an external monitor.

### 2.7 Production troubleshooting

| Symptom | Cause / fix |
|---|---|
| Render build fails at `prisma generate` | Root Directory must be `backend`; ensure latest commit is deployed |
| Render: `SUPABASE_URL is required…` / `CORS_ORIGINS is required in production` | Add the env var |
| Render: `ENETUNREACH`/`ENOTFOUND` to Supabase | Direct host used; use Session pooler |
| Render: `self-signed certificate` | Remove `sslmode`; `DB_SSL=true` |
| Browser CORS error | `CORS_ORIGINS` ≠ exact Vercel origin (`https`, no `/`), or Render still redeploying |
| Browser calls go to `vercel.app/api/v1` and 404 | `VITE_API_BASE_URL` missing at build time; set and redeploy |
| Login screen does nothing / "Invalid API key" | `VITE_SUPABASE_*` missing/wrong on Vercel; redeploy |
| Emails not arriving / only 2–4 per hour | Built-in mailer limit → configure custom SMTP |
| Email link opens localhost | Site URL in Supabase still `localhost` |
| Reset page says "link invalid or expired" | Links are single-use and short-lived; request a new one; confirm `/reset-password` is in Redirect URLs |
| 401 `TOKEN_INVALID` for everyone | Render `SUPABASE_URL` ≠ the project Vercel signs into |
| 503 `AUTH_PROVIDER_UNAVAILABLE` | API can't reach Supabase's JWKS endpoint (outage/network) |
| Deep link refresh → Vercel 404 | Root Directory not `frontend` |
| First request ~1 min | Render free tier cold start |

### 2.8 Security checklist
- [ ] RLS enabled on every `public` table (§1.3) and verified with the `curl` test
- [ ] "Confirm email" on; password minimum 12
- [ ] Custom SMTP configured; CAPTCHA considered
- [ ] Service-role/secret key only on Render; never in Vercel, the frontend or Git
- [ ] `CORS_ORIGINS` = real frontend origin(s) only
- [ ] The single platform admin uses a unique real inbox and a strong password
- [ ] DB password rotated if it was ever in a committed `.env`, chat or screenshot
