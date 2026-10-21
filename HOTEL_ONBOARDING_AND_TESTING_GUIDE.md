# ROOST – Hotels (tenants), onboarding and end-to-end testing

Read this after [SETUP_AND_DEPLOYMENT_GUIDE.md](SETUP_AND_DEPLOYMENT_GUIDE.md) (Supabase, env files, running the servers).

---

## 1. How the platform is organised

Every hotel is a **tenant** with its own URL and its own data:

```
https://your-app.vercel.app/                  ROOST platform landing page
https://your-app.vercel.app/platform/login    Super-admin sign in (you, the ROOST team)
https://your-app.vercel.app/platform/hotels   Super-admin console: create / suspend hotels

https://your-app.vercel.app/sunrise-test              Hotel home page (logo, name, properties, contact)
https://your-app.vercel.app/sunrise-test/login        Sign in (guest / owner / manager / reception / staff)
https://your-app.vercel.app/sunrise-test/owner/setup  Owner onboarding / hotel profile
https://your-app.vercel.app/sunrise-test/properties   Only this hotel's properties
…everything else under /sunrise-test/…
```

How isolation works:
- **Frontend:** the first URL segment is the hotel. The whole hotel app is mounted under that prefix, and the browser sends it to the API as `X-Tenant-Slug: sunrise-test`.
- **API:** public pages (properties, rooms, availability, booking) are filtered to that hotel. Staff data was already filtered by the signed-in user's `tenant_id`; now a staff token is also **rejected (403 `TENANT_MISMATCH`)** if used on another hotel's URL, and when a hotel is suspended (`TENANT_SUSPENDED`).
- **Guests** have one ROOST login that works at any hotel, but each hotel only shows the guest their own bookings there.

### Who can do what

| Role | Created by | Can do |
|---|---|---|
| **Platform admin** (you) | `make-admin.js` – **exactly one exists** (enforced by the script, the API and a database unique index) | Create / suspend hotels, re-invite owners or issue temporary passwords at `/platform/hotels`. Cannot be created through the app. |
| **Owner** | Platform admin (invite) | Finish the hotel profile and logo, add properties/rooms/beds, create Manager / Receptionist / Staff accounts, settings, reports, audit logs |
| **Manager** | Owner | Operations, reports, create Receptionist/Staff |
| **Receptionist / Staff** | Owner / Manager | Front desk: guests, bookings, check-in/out, payments |
| **Guest** | Self sign-up at `/<hotel>/register` | Browse, book, view own bookings, complaints, feedback |

### Decision: owners cannot self-register (invite-only)
Anyone being able to create a hotel would let strangers occupy your platform, so hotel creation is **only done by the platform admin**. Two ways to give an owner access (chosen in the "Add hotel" dialog):

1. **Email invitation (recommended):** Supabase emails the owner a link; they choose their own password.
2. **Temporary password:** you get a one-time password to hand over; the owner is forced to replace it on first sign-in.

Either way the owner then lands on **Hotel setup** (name, address, contact, logo, colour) before reaching the dashboard.
(A public "request a hotel" form with an approval queue can be added later without changing this model.)

> **Needs `SUPABASE_SERVICE_ROLE_KEY` on the API** for invites, temporary passwords, staff logins created by owners, and logo storage. Without it everything still works but: the hotel + owner profile are created without a login, the owner uses **Sign up** at the hotel URL with the exact invited email (email confirmation proves they own it), and logos are stored inline (≤ 500 KB).

---

## 2. One-time setup for this feature

1. **Pull the code**, then from `backend/`:
   ```sh
   npm install            # (root: npm run install:all)
   npx prisma migrate deploy      # applies 0001_init (hotel profile, branding and Supabase link included)
   ```
2. **Backend `.env`** – add/confirm:
   ```env
   AUTH_MODE=supabase
   SUPABASE_URL=https://fpccdjzhsprfsmgrizly.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<Supabase → Project Settings → API Keys → secret key>   # recommended
   PUBLIC_APP_URL=http://localhost:5173
   CORS_ORIGINS=http://localhost:5173
   ```
3. **Supabase → Authentication → URL Configuration:** Site URL `http://localhost:5173`; Redirect URLs `http://localhost:5173/**` (this wildcard covers `/<hotel>/reset-password`).
4. **Re-run the RLS SQL** from the main guide §1.3 (new tables/columns need nothing, but keep every table protected).
5. Restart both servers: `npm run dev:backend`, `npm run dev:frontend`.

---

## 3. Local test plan (step by step)

Use Gmail `+alias` addresses so one inbox plays every role: `you+admin@gmail.com`, `you+owner1@gmail.com`, `you+owner2@gmail.com`, `you+reception@gmail.com`, `you+manager@gmail.com`, `you+guest@gmail.com`. Use separate browser profiles/incognito windows for different people.

### Step 0 – Create the platform admin (you)
1. Supabase → **Authentication → Users → Add user → Create new user**: email `you+admin@gmail.com`, a 12+ char password, tick **Auto Confirm User**.
2. From `backend/`:
   ```sh
   node scripts/make-admin.js you+admin@gmail.com
   ```
3. Open `http://localhost:5173/platform/login` and sign in. ✅ You see the **Hotels** console (empty).

### Step 1 – Create the test hotels
**Hotel A – "Sunrise Test Stay" (`sunrise-test`), pre-filled with rooms and beds** (fast fixture for booking tests):
```sh
cd backend
node scripts/create-test-hotel.js you+owner1@gmail.com sunrise-test
```
Creates the hotel, a published property "Sunrise Main Branch", room 101 (AC, 4 beds, ₹900) and room 102 (Non-AC, 6 beds, ₹600), and an owner profile (no login yet).

**Hotel B – "Harbor Test Hotel" (`harbor-test`), empty, created through the real flow** (tests onboarding and isolation):
1. Console → **+ Add hotel**: name `Harbor Test Hotel`, URL `harbor-test` (auto-filled), owner `Harbor Owner`, `you+owner2@gmail.com`, access **Email invitation** → Create.
2. ✅ A summary shows the hotel URL and "An email with a set-password link was sent".
3. ✅ The table lists Harbor (and Sunrise, once created) as "Awaiting owner".

Give Hotel A's owner a login: in the console click **Re-invite** on Sunrise. ✅ "An email … was sent".

### Step 2 – Owner invitation and onboarding (Hotel B)
1. Open the invitation email for `you+owner2@gmail.com` and click the link. ✅ You land on `http://localhost:5173/harbor-test/reset-password` ("Choose a new password").
2. Set a 12+ character password. ✅ Redirected to `/harbor-test/login`.
3. Sign in as **Owner**. ✅ You are sent to **`/harbor-test/owner/setup`** and cannot reach any other owner page yet (try `/harbor-test/owner/properties` → bounced back).
4. Fill in: tagline, description, phone `9876500001`, address, city, upload a PNG/JPEG logo, pick a brand colour → **Save and continue**.
5. ✅ You land on the owner dashboard. The sidebar and top bar show Harbor's name and logo.
6. Open `http://localhost:5173/harbor-test`. ✅ The public home shows the logo, name, tagline, colour, address/phone, and "We're getting our rooms ready" (no properties yet).
7. In Supabase → Storage ✅ bucket `tenant-logos` exists with your file (only when the service key is set; if storage is unavailable the logo is kept inline and still works).

### Step 3 – Owner configures the hotel (Hotel B)
1. **Properties → add** "Harbor Central", then **publish** it.
2. **Rooms & beds** → add room `201` (price 700) and beds `201-A` … `201-C`.
3. ✅ `http://localhost:5173/harbor-test/properties` lists Harbor Central; its details page shows room 201 with 3 beds.

### Step 4 – Owner builds the team (Hotel B)
1. **Team & roles** (`/harbor-test/users`) → create `Front Desk` as **Receptionist** (`you+reception@gmail.com`, 12+ char password) and `Floor Manager` as **Manager**.
2. ✅ The owner can create Manager/Receptionist/Staff, but **not** another Owner or Platform Admin (the role list does not offer them; the API refuses with 403).
3. In incognito sign in at `/harbor-test/login` as each. ✅ Receptionist lands on the reception dashboard, Manager on the manager dashboard; neither can open `/harbor-test/owner/setup` or `/users`.
4. Suspend the receptionist from the Team page, try to sign in/use the app → blocked; reactivate.

### Step 5 – Owner for Hotel A
1. Open the invitation for `you+owner1@gmail.com`, set a password, sign in at `/sunrise-test/login` as Owner, complete the setup form.
2. ✅ You are forced through the setup form first (address and city are pre-filled); afterwards Rooms & beds shows rooms 101 and 102 with their beds.

### Step 6 – Guest booking flow (Hotel A)
1. Incognito → `http://localhost:5173/sunrise-test`. ✅ Sunrise branding, "Sunrise Main Branch" only.
2. **Sign up** as guest (`you+guest@gmail.com`) → confirmation email → click link → sign in at `/sunrise-test/login` (role Guest).
3. Pick dates → **Find a bed** → Sunrise Main Branch → pick a bed in room 101 → enter guest details → review → submit. ✅ Booking success page with a booking code (status PENDING).
4. As Sunrise **Owner**: Bookings → the new booking appears → **Confirm**. ✅ Guest's **My bookings** shows CONFIRMED.
5. Optional front-desk steps as Receptionist/Owner: check-in, collect payment, check-out, invoice.
6. Guest: raise a complaint and leave feedback; owner sees both.

### Step 7 – Isolation checks (the important ones)
1. `http://localhost:5173/harbor-test/properties` ✅ shows only Harbor Central — not Sunrise Main Branch (and vice versa).
2. Sign in on `/harbor-test/login` using **Sunrise owner** credentials. ✅ Rejected: "This account belongs to a different hotel."
3. `http://localhost:5173/does-not-exist` ✅ "Hotel not found".
4. API level (replace `<TOKEN>` with the Sunrise owner's access token – DevTools → Application → Local Storage → key `sb-fpccdjzhsprfsmgrizly-auth-token` → `access_token`):
   ```sh
   # Sunrise token on Harbor's address -> 403 TENANT_MISMATCH
   curl -i -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: harbor-test" http://localhost:5000/api/v1/auth/me
   # Public property of Sunrise requested as Harbor -> 404
   curl -i -H "X-Tenant-Slug: harbor-test" http://localhost:5000/api/v1/properties/sunrise-main
   # Public list with no hotel -> 400 TENANT_REQUIRED
   curl -i http://localhost:5000/api/v1/properties
   # Owner token on a platform endpoint -> 403
   curl -i -H "Authorization: Bearer <TOKEN>" http://localhost:5000/api/v1/platform/tenants
   ```
5. A guest tries `/sunrise-test/owner` → redirected to the guest dashboard.

### Step 8 – Suspend / reactivate a hotel
1. Console → **Suspend** on Sunrise → confirm.
2. ✅ `http://localhost:5173/sunrise-test` shows "This hotel is unavailable"; Sunrise staff API calls return 403 `TENANT_SUSPENDED`; Harbor is unaffected.
3. **Activate** → everything works again (the API caches hotel status for up to 30 s).

### Step 9 – Password flows
1. **Temporary password:** Console → **Temp password** on Harbor → copy the shown details. Sign in as the owner with it → ✅ forced to "Choose your own password", then onward to the dashboard. The console column changes from "Temp password" to "Has login".
2. **Forgot password:** `/harbor-test/forgot-password` → email → link → `/harbor-test/reset-password` → new password → sign in.
3. **Change password** from the guest profile page (needs the old password).

### Step 10 – Regression
```sh
npm test            # backend unit tests
npm run lint
npm run build
```

### What "pass" means
All ✅ above hold, and nothing created in Hotel A ever appears in Hotel B.

---

## 4. Going live

Follow Part 2 of the main guide, plus:

| Where | Add / change |
|---|---|
| Render env | `SUPABASE_SERVICE_ROLE_KEY` (secret), `PUBLIC_APP_URL=https://<your-app>.vercel.app`, `CORS_ORIGINS=https://<your-app>.vercel.app` |
| Supabase → Auth → URL Configuration | Site URL = `https://<your-app>.vercel.app`; Redirect URLs `https://<your-app>.vercel.app/**` |
| Supabase → Auth → Emails | Custom SMTP; customise the **Invite user**, **Confirm signup** and **Reset password** templates (owners receive the invite) |
| Vercel | No new variables. Hotels are path-based (`/<slug>`), so one domain serves all hotels. `frontend/vercel.json` already rewrites every path to the SPA |
| Database | `npx prisma migrate deploy` against production; re-run the RLS SQL |

Go-live sequence:
1. Create your platform admin in Supabase (Step 0) against **production** and run `make-admin.js` with the production `DATABASE_URL`.
2. Sign in at `https://<app>/platform/login` and **Add hotel** for each real client (invite mode). Send them their hotel URL, e.g. `https://<app>/<slug>`.
3. Keep `sunrise-test` / `harbor-test` as permanent test hotels or suspend them.
4. Each client: accepts the invite → sets password → completes setup → adds properties, rooms, beds, team.

### Optional next steps (not built yet)
- Custom domain per hotel (`stay.client.com`) and subdomains (`client.roost.app`) instead of `/<slug>`.
- Brand colour applied across the whole UI theme (currently the hotel home hero/button and logo/name everywhere).
- Hotel-specific About / Gallery content (the generic About, Pricing, Privacy and Terms pages were removed; Contact uses the hotel's details).
- A public "request a hotel" form with an approval queue.
