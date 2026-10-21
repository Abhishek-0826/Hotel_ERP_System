# ROOST – QA Test Suite

Manual test suite for the ROOST multi-tenant bed/room booking platform.
Part A = basic (happy-path) test cases. Part B = edge, negative, security and isolation cases.

---

## 0. How to use this document

**Result column:** mark each case `PASS` / `FAIL` / `BLOCKED`. For every FAIL, log a bug with the Test ID, steps, expected vs actual, screenshot and browser console/network output.

**ID format:** `<AREA>-<NN>` (basic) and `E-<AREA>-<NN>` (edge).

| Area code | Area |
|---|---|
| PLT | Platform admin console |
| ONB | Owner invitation & onboarding |
| AUTH | Sign up / sign in / password flows |
| PRP | Properties, rooms, beds (owner) |
| TEAM | Team & roles |
| DISC | Public discovery & availability |
| BKG | Guest booking flow |
| OWN | Owner/staff booking management |
| FD | Front desk: guests, check-in/out, payments, invoices, refunds |
| EXP | Complaints & feedback |
| RPT | Reports, BI, audit logs, settings |
| NTF | Notifications |
| UI | Responsive / cross-browser / UX |

### 0.1 Environment & test data

| Item | Value |
|---|---|
| Frontend | `http://localhost:5173` (or the staging URL) |
| API | `http://localhost:5000/api/v1` (Swagger docs at `/api-docs`) |
| Hotel A | `sunrise-test` – pre-filled: property *Sunrise Main Branch*, room 101 (AC, 4 beds, ₹900), room 102 (Non-AC, 6 beds, ₹600) |
| Hotel B | `harbor-test` – empty; created through the real onboarding flow |
| Accounts needed | 1 platform admin, 2 owners (A, B), 1 manager, 1 receptionist, 1 staff, 2 guests (use Gmail `+alias` addresses) |
| Browsers | Latest Chrome, Firefox, Safari/WebKit (or Edge) + one real mobile device |
| Isolation | Use separate incognito windows/profiles per role; never test two roles in the same session |

Setup steps (platform admin, test hotels) are in `HOTEL_ONBOARDING_AND_TESTING_GUIDE.md` §3 Steps 0–1.

### 0.2 Roles & expected access (reference matrix)

| Area / page | Platform admin | Owner | Manager | Receptionist | Staff | Guest | Anonymous |
|---|---|---|---|---|---|---|---|
| `/platform/*` console | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/owner/setup`, `/owner/*` | – | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Properties/rooms/beds management | – | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Team (`/users`, `/managers`, `/receptionists`) | – | ✅ | ✅ (create Receptionist/Staff) | ❌ | ❌ | ❌ | ❌ |
| Confirm / reject booking | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Guests, check-in/out, beds, invoices | – | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Collect payment | – | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve / reject refund | – | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory | – | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| BI, settings, audit logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cameras, backup, access control | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Complaints / feedback – raise | – | – | – | – | – | ✅ | ❌ |
| Complaints / feedback – manage | – | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| My bookings, profile, payments (own) | – | – | – | – | – | ✅ | ❌ |
| Browse properties, book | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (booking may need sign-in) |

> If the app's actual behaviour differs from this matrix, raise it as a defect or a spec clarification.

### 0.3 Key business rules under test

- Booking lifecycle: `PENDING → CONFIRMED | REJECTED | CANCELLED`; `CONFIRMED → CANCELLED | COMPLETED`. All other transitions are invalid.
- Only one active (PENDING/CONFIRMED) booking per bed per date range.
- Check-out must be after check-in; check-in cannot be in the past.
- Phone: 10-digit Indian mobile starting 6–9. Password: min **12** characters. Name: 2–255 characters.
- Rejection reason: min 5 characters. Refund reason: min 5 characters.
- Payment amount: positive, max 10,000,000; up to 5 split payments per transaction.
- Exactly **one** platform admin can exist.
- A user of Hotel A must never see or modify Hotel B data (`TENANT_MISMATCH`, `TENANT_SUSPENDED`).

---

# PART A – BASIC TEST CASES

## A1. Platform admin console

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| PLT-01 | Platform admin login | 1. Open `/platform/login`. 2. Enter admin email + password. 3. Submit. | Lands on `/platform/hotels`; hotel table visible. | |
| PLT-02 | Create hotel (email invitation) | 1. Click **+ Add hotel**. 2. Name `Harbor Test Hotel`; slug auto-fills `harbor-test`. 3. Owner name + email. 4. Access = Email invitation. 5. Create. | Summary shows hotel URL and "email … was sent". Hotel appears in table as *Awaiting owner*. | |
| PLT-03 | Create hotel (temporary password) | Same as PLT-02 with Access = Temporary password. | One-time password displayed once; hotel listed as *Temp password*. | |
| PLT-04 | Slug auto-generation | Type hotel name `My  Grand Hotel`. | Slug becomes lowercase, hyphenated (`my-grand-hotel`), editable. | |
| PLT-05 | Re-invite owner | Click **Re-invite** on a hotel. | Success message; new email received. | |
| PLT-06 | Issue temporary password | Click **Temp password** on a hotel. | New password shown; owner must change it on next sign-in. | |
| PLT-07 | Suspend hotel | Click **Suspend** → confirm. | Status = Suspended. Public hotel URL shows "This hotel is unavailable". | |
| PLT-08 | Reactivate hotel | Click **Activate** on suspended hotel. | Hotel accessible again (allow up to 30 s cache). | |
| PLT-09 | Platform admin logout | Use sign-out. | Returned to login; `/platform/hotels` now redirects to login. | |

## A2. Owner invitation & onboarding

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| ONB-01 | Accept invitation | 1. Open invite email. 2. Click link. | Lands on `/<hotel>/reset-password` ("Choose a new password"). | |
| ONB-02 | Set password | Enter a valid 12+ char password; submit. | Redirected to `/<hotel>/login`. | |
| ONB-03 | Owner first sign-in forces setup | Sign in as owner. | Redirected to `/<hotel>/owner/setup`. Other owner pages (e.g. `/owner/properties`) redirect back to setup. | |
| ONB-04 | Complete hotel setup | Fill tagline, description, phone `9876500001`, address, city; upload PNG logo; pick colour; **Save and continue**. | Redirect to owner dashboard. Sidebar/top bar show hotel name + logo. | |
| ONB-05 | Public hotel home reflects setup | Open `/<hotel>` anonymously. | Logo, name, tagline, colour, address/phone visible; "getting our rooms ready" if no properties. | |
| ONB-06 | Temp-password first login | Sign in with temp password. | Forced "Choose your own password" screen, then dashboard. | |

## A3. Authentication (all roles)

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| AUTH-01 | Guest sign-up | `/<hotel>/register` → name, email, phone, 12+ char password → submit. | Success message; confirmation email sent. | |
| AUTH-02 | Email confirmation | Click link in confirmation email. | Account confirmed; can sign in. | |
| AUTH-03 | Guest sign-in | `/<hotel>/login` → credentials. | Lands on guest dashboard/home. | |
| AUTH-04 | Owner / Manager / Receptionist / Staff sign-in | Sign in as each. | Owner → owner dashboard; Manager → `/manager/dashboard`; Receptionist → `/reception/dashboard`; Staff → `/staff/dashboard`. | |
| AUTH-05 | Sign-out | Use sign-out in header/sidebar. | Session cleared; protected URLs redirect to login. | |
| AUTH-06 | Forgot password | `/forgot-password` → email → submit → open email link → set new password → sign in. | Reset email received; new password works; old one fails. | |
| AUTH-07 | Change password | Guest profile → old password + new 12+ char password. | Success; next login requires the new password. | |
| AUTH-08 | Update profile | Change name and phone on profile/account page. | Saved; reflected after refresh. | |
| AUTH-09 | Session persistence | Sign in → refresh page / close & reopen tab. | Still signed in. | |
| AUTH-10 | Protected route redirect | Signed out, open `/my-bookings`. | Redirected to login; after login returns to the intended page (if supported). | |

## A4. Properties, rooms and beds (Owner)

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| PRP-01 | Create property | Owner → Properties → Add: name, address, city, details → Save. | Property listed with status DRAFT. | |
| PRP-02 | Publish property | Publish the property. | Status PUBLISHED; visible on `/<hotel>/properties`. | |
| PRP-03 | Unpublish property | Unpublish. | No longer visible publicly; existing bookings unaffected. | |
| PRP-04 | Edit property | Change name/description → Save. | Changes persisted. | |
| PRP-05 | Add room | Rooms & beds → Add room: number `201`, floor, gender policy, AC, attached bathroom, price 700. | Room listed under the property. | |
| PRP-06 | Edit room | Change price / AC / gender policy. | Saved and reflected on public page. | |
| PRP-07 | Set room status | Set room to MAINTENANCE / INACTIVE / ACTIVE. | Status persisted; non-ACTIVE rooms cannot be booked. | |
| PRP-08 | Add beds | Add beds `201-A`, `201-B`, `201-C` with positions (UPPER/LOWER/SINGLE). | Beds listed under room. | |
| PRP-09 | Bed price override | Set override price on one bed. | That bed shows override price; others use room price. | |
| PRP-10 | Bed status change | Set a bed to MAINTENANCE then back to AVAILABLE. | Status updates; MAINTENANCE bed not bookable. | |
| PRP-11 | Amenities | Attach amenities to property and room. | Show on the public details page. | |
| PRP-12 | Public property details | Open property details as anonymous user. | Rooms with bed counts, prices and amenities are shown. | |

## A5. Team & roles

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| TEAM-01 | Owner creates Receptionist | Team & roles → create *Front Desk*, role Receptionist, email, 12+ char password. | Account created; can sign in. | |
| TEAM-02 | Owner creates Manager | Same with role Manager. | Created; lands on manager dashboard on login. | |
| TEAM-03 | Owner creates Staff | Same with role Staff. | Created. | |
| TEAM-04 | Manager creates Receptionist/Staff | Sign in as manager → create a receptionist. | Allowed. | |
| TEAM-05 | Suspend a user | Suspend receptionist from Team page; try signing in. | Sign-in/API blocked. | |
| TEAM-06 | Reactivate a user | Reactivate the user. | Can sign in again. | |
| TEAM-07 | Role options list | Open role dropdown as owner. | Offers Manager/Receptionist/Staff only – **not** Owner or Platform Admin. | |

## A6. Public discovery & availability

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| DISC-01 | Hotel home | Open `/sunrise-test`. | Hotel branding; only *Sunrise* properties listed. | |
| DISC-02 | Property list | Open `/sunrise-test/properties`. | Only published properties of this hotel. | |
| DISC-03 | Search / filter | Search by name/city/filters. | Results match; empty result shows empty-state. | |
| DISC-04 | Property details | Open a property. | Rooms, beds, price, amenities displayed. | |
| DISC-05 | Bed availability | Open availability; choose dates → **Find a bed**. | Booked/unavailable beds are marked; available ones selectable. | |
| DISC-06 | Gallery / Contact pages | Open `/gallery`, `/contact`. | Pages render with the hotel's details. | |
| DISC-07 | Unknown hotel | Open `/does-not-exist`. | "Hotel not found" page. | |
| DISC-08 | Suspended hotel | Suspend hotel (PLT-07) then open its URL. | "This hotel is unavailable". | |

## A7. Guest booking flow

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| BKG-01 | Complete booking | Select dates → property → bed in room 101 → guest details (name, 10-digit phone, email) → review → submit. | Success page with booking code; status **PENDING**. | |
| BKG-02 | Booking summary accuracy | On review page, verify property, room, bed, dates, nights, price. | Total = nights × bed price (override honoured). | |
| BKG-03 | Booking appears in My Bookings | Guest → My bookings. | New booking listed with correct status. | |
| BKG-04 | View booking by code | Open `/booking/<code>`. | Details + QR ticket shown. | |
| BKG-05 | Guest cancels PENDING booking | My bookings → cancel (optional reason). | Status CANCELLED; bed becomes bookable again. | |
| BKG-06 | Guest sees confirmed status | After owner confirms (OWN-01). | Guest sees CONFIRMED and QR code. | |
| BKG-07 | Guest sees rejection reason | After owner rejects (OWN-02). | Status REJECTED with reason shown. | |
| BKG-08 | Booking filters | Filter My bookings by status. | List filtered correctly; pagination works. | |
| BKG-09 | Back/forward navigation in flow | Move through steps using back button. | Entered data retained; no crash. | |

## A8. Owner / staff booking management

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| OWN-01 | Confirm booking | Owner → Bookings → open PENDING booking → **Confirm**. | Status CONFIRMED; guest notified. | |
| OWN-02 | Reject booking | Reject with reason ≥ 5 chars. | Status REJECTED; reason stored; bed released. | |
| OWN-03 | Cancel confirmed booking | Cancel a CONFIRMED booking. | Status CANCELLED; bed released. | |
| OWN-04 | List filters | Filter by status, payment status, source, date range, search text. | Results correct; pagination works. | |
| OWN-05 | Manager confirms booking | Repeat OWN-01 as manager. | Allowed. | |
| OWN-06 | Receptionist cannot confirm | As receptionist, attempt to confirm (UI or API). | Not offered in UI; API returns 403. | |
| OWN-07 | QR generator | Owner → QR generator for a property/booking. | QR renders; downloadable; scans to the correct URL. | |

## A9. Front desk (guests, check-in/out, payments, invoices)

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| FD-01 | Register walk-in guest | Guests → Register: name, 10-digit phone, optional email/ID/address/DOB/gender/emergency contact. | Guest created and listed. | |
| FD-02 | Create walk-in booking | Bookings → New: select guest, property, room, bed, dates; source WALK_IN. | Booking created. | |
| FD-03 | Check-in with ID | Check-in page → enter booking code (or scan QR) → ID type + number. | Status → checked-in; bed OCCUPIED. | |
| FD-04 | QR scan check-in | Use scanner with a booking QR (camera permission granted). | Booking loads automatically. | |
| FD-05 | Bed grid | Open Beds grid. | Beds coloured by status (available/reserved/occupied/maintenance). | |
| FD-06 | Bed allocation | Allocate / reassign a bed. | Updated in grid and booking. | |
| FD-07 | Collect payment – single | Payments → select booking → amount + method (CASH). | Payment recorded; booking payment status updated (PARTIAL/PAID). | |
| FD-08 | Collect payment – split | Add 2 splits (e.g. CASH + UPI with reference). | Both recorded; totals add up. | |
| FD-09 | Check-out | Check-out page → booking → confirm. | Booking COMPLETED; bed freed. | |
| FD-10 | Invoice list & view | Invoices → open one. | Invoice shows guest, items, taxes, totals, payments. | |
| FD-11 | Print / download invoice | Use print/download. | Output is readable and matches on-screen data. | |
| FD-12 | Request refund | Receptionist/owner requests refund on a payment with reason ≥ 5 chars. | Refund created as pending. | |
| FD-13 | Approve refund | Owner/manager → Refunds → **Approve**. | Status approved; payment/refund totals updated. | |
| FD-14 | Reject refund | **Reject**. | Status rejected; no money movement. | |
| FD-15 | Guest profile | Open a guest profile. | Shows details, booking history. | |

## A10. Complaints & feedback

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| EXP-01 | Guest raises complaint | Guest → Complaints → new with subject + description. | Saved; listed under guest. | |
| EXP-02 | Staff views/updates complaint | Owner/staff → Complaints → update status/resolution. | Status changes; guest sees update. | |
| EXP-03 | Guest submits feedback | Guest → Feedback → rating + comment. | Saved. | |
| EXP-04 | Staff views feedback | Owner/staff → Feedback. | Feedback visible with rating/comment. | |

## A11. Reports, BI, settings, audit, inventory

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| RPT-01 | Owner dashboard KPIs | Open `/owner`. | KPI cards (occupancy, revenue, bookings) match actual data. | |
| RPT-02 | Reports page | `/reports` → choose report + date range. | Data renders; numbers match bookings/payments. | |
| RPT-03 | Report download | `/reports/download`. | File downloads, opens, contents correct. | |
| RPT-04 | BI daily/weekly/monthly | `/bi`, `/bi/weekly`, `/bi/monthly`. | Charts load; period selectors work. | |
| RPT-05 | Audit logs | `/audit-logs` after performing actions. | Entries for create/confirm/payment etc. with actor + timestamp. | |
| RPT-06 | System settings | `/settings` → change and save a setting. | Persisted after refresh. | |
| RPT-07 | Inventory | `/inventory` → add item; record stock in/out. | Quantities update; transaction history recorded. | |
| RPT-08 | Cameras / backup (platform admin) | Open `/cameras`, `/backup`. | Pages load for admin only. | |

## A12. Notifications

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| NTF-01 | Confirmation notification | Confirm a booking. | Guest gets in-app notification + email. | |
| NTF-02 | Notifications panel | Open the bell/panel. | Unread count correct; list ordered newest first. | |
| NTF-03 | Mark as read | Mark one / all read. | Count decreases; state persists after refresh. | |

## A13. UI / general

| ID | Title | Steps | Expected result | Result |
|---|---|---|---|---|
| UI-01 | Responsive layout | Test at 360, 768, 1280, 1920 px widths. | No horizontal scroll or overlap; sidebar collapses on mobile. | |
| UI-02 | Cross-browser | Run PLT-01, BKG-01, OWN-01 on Chrome, Firefox, Safari/WebKit. | Same behaviour in all. | |
| UI-03 | Loading/empty/error states | Throttle network; view lists with no data. | Spinners, empty states, error messages with retry. | |
| UI-04 | Toasts | Perform success and failure actions. | Toast shows relevant message and auto-dismisses. | |
| UI-05 | Pagination | Lists with > 1 page. | Next/prev/page-size work; counts correct. | |
| UI-06 | 404 page | Open a nonsense route inside a hotel. | NotFound page with a way back. | |
| UI-07 | Branding | Open Hotel A and Hotel B. | Each shows own logo, name, colour. | |

---

# PART B – EDGE, NEGATIVE, SECURITY & ISOLATION CASES

## B1. Multi-tenant isolation (highest priority)

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-ISO-01 | Property listing isolation | Open `/harbor-test/properties` and `/sunrise-test/properties`. | Each shows only its own properties. | |
| E-ISO-02 | Cross-hotel login | Sign in at `/harbor-test/login` with a Sunrise owner. | Rejected: "This account belongs to a different hotel." | |
| E-ISO-03 | Token reuse across hotels (API) | Call `GET /auth/me` with Sunrise token and header `X-Tenant-Slug: harbor-test`. | 403 `TENANT_MISMATCH`. | |
| E-ISO-04 | Public resource of another hotel | `GET /properties/<sunrise-slug>` with `X-Tenant-Slug: harbor-test`. | 404. | |
| E-ISO-05 | Missing tenant header | `GET /properties` with no `X-Tenant-Slug`. | 400 `TENANT_REQUIRED`. | |
| E-ISO-06 | Booking IDs across hotels | Using a Harbor token, request booking code / room / bed IDs belonging to Sunrise (GET, PATCH confirm, cancel). | 404/403; no data leaked, nothing modified. | |
| E-ISO-07 | Create booking with another hotel's IDs | `POST /bookings` with Harbor `X-Tenant-Slug` but Sunrise propertyId/roomId/bedId. | 404 (`PROPERTY_NOT_FOUND`); no booking created. | |
| E-ISO-08 | ID enumeration | Increment numeric IDs in URLs (`/guests/<id>`, `/invoices/<id>`, `/bookings/<id>`). | Other hotels' records never returned. | |
| E-ISO-09 | Suspended hotel API | While Sunrise is suspended, call API with Sunrise staff token. | 403 `TENANT_SUSPENDED`; Harbor unaffected. | |
| E-ISO-10 | Same guest at two hotels | One guest login books at A and B. | My bookings at A shows only A's; at B only B's. | |
| E-ISO-11 | Slug collision | Create a hotel with an existing slug. | Rejected with clear message. | |
| E-ISO-12 | Reserved / malformed slugs | Try slugs `platform`, `login`, `api`, `A B`, `ünï`, `-abc-`, very long. | Rejected or normalised; no route conflicts. | |
| E-ISO-13 | Cache window | Suspend then immediately reload tenant. | Becomes unavailable within 30 s (document actual delay). | |

## B2. Authentication & session edge cases

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-AUTH-01 | Password too short | Register/change password with 11 chars. | Rejected: min 12 characters. | |
| E-AUTH-02 | Password boundary | Use exactly 12 chars; then 128+ chars; then with spaces/unicode/emoji. | 12 accepted; long and unicode handled without error (or clear limit message). | |
| E-AUTH-03 | Invalid email formats | `a@b`, `a@@b.com`, spaces, `a@b.c`, very long (> 254). | Rejected with field-level error. | |
| E-AUTH-04 | Email case/whitespace | Register `User@Mail.com`, login with `user@mail.com`, and with leading/trailing spaces. | Treated as same account; trimmed. | |
| E-AUTH-05 | Duplicate registration | Register an already-used email. | Clear error; no second account; no email enumeration beyond policy. | |
| E-AUTH-06 | Invalid phone | `5123456789`, `98765`, `98765432101`, letters, `+91…`, spaces. | Rejected: valid 10-digit mobile starting 6–9. | |
| E-AUTH-07 | Name boundaries | 1 char, 2 chars, 255 chars, 256 chars, only spaces. | 1/256/blank rejected; 2 and 255 accepted. | |
| E-AUTH-08 | Wrong credentials | Wrong password; non-existent email. | Generic error; same message for both; no lockout bypass. | |
| E-AUTH-09 | Brute force | 10+ rapid failed logins. | Rate-limited / throttled (note behaviour). | |
| E-AUTH-10 | Expired / reused reset link | Use reset link twice, or after expiry. | Second use / expired link rejected with clear message. | |
| E-AUTH-11 | Reset link on wrong hotel | Open reset link under another hotel's slug. | Handled safely; no cross-hotel session. | |
| E-AUTH-12 | Forgot password unknown email | Submit unregistered email. | Same neutral confirmation message (no account disclosure). | |
| E-AUTH-13 | Change password wrong old password | Provide incorrect old password. | Rejected; password unchanged. | |
| E-AUTH-14 | Token tampering | Edit `access_token` in local storage; replay expired token. | 401; user sent to login. | |
| E-AUTH-15 | Concurrent sessions | Sign in on 2 browsers; change password in one. | Other session behaves per policy (re-auth or continues) – record. | |
| E-AUTH-16 | Back button after logout | Sign out, press Back. | Protected page not shown from cache. | |
| E-AUTH-17 | Suspended user session | Suspend user while they're signed in; they click around. | Next API call is rejected; user is logged out. | |
| E-AUTH-18 | Unconfirmed email login | Sign up but don't confirm; try to sign in. | Blocked with "confirm your email". | |
| E-AUTH-19 | Second platform admin | Try `make-admin.js` for another email, or create admin via API. | Refused – exactly one platform admin allowed. | |
| E-AUTH-20 | Deprecated `ADMIN` role | Verify no UI path creates `ADMIN`; existing `ADMIN` behaves as platform admin. | As stated. | |
| E-AUTH-21 | Temp password reuse | Use temp password after having set own password. | No longer valid. | |
| E-AUTH-22 | Injection in login | Enter `' OR 1=1 --`, `<script>alert(1)</script>` in email/password. | Rejected by validation; no script execution; no SQL error. | |

## B3. Role-based access control (RBAC)

Test each row by (a) typing the URL directly and (b) calling the API with that role's token.

| ID | Scenario | Expected | Result |
|---|---|---|---|
| E-RBAC-01 | Guest opens `/owner`, `/users`, `/reports`, `/audit-logs`, `/check-in` | Redirected to guest dashboard; API returns 403. | |
| E-RBAC-02 | Receptionist opens `/owner/setup`, `/users`, `/settings`, `/bi`, `/refunds`, `/inventory` | Redirected/blocked; API 403. | |
| E-RBAC-03 | Staff attempts to approve refund, confirm booking, create users | 403. | |
| E-RBAC-04 | Manager attempts `/settings`, `/audit-logs`, `/bi`, `/owner/*`, `/cameras`, `/backup` | Blocked. | |
| E-RBAC-05 | Owner attempts `/platform/*`, `/cameras`, `/backup`, `/access-control` | 403 / redirected. | |
| E-RBAC-06 | Owner token on `GET /platform/tenants` | 403. | |
| E-RBAC-07 | Owner tries to create Owner or Platform Admin via API (`POST` with role OWNER/PLATFORM_ADMIN) | 403/400; not created. | |
| E-RBAC-08 | Manager creates a Manager or Owner | Refused (only Receptionist/Staff allowed). | |
| E-RBAC-09 | Privilege escalation via profile update (`role` in PATCH body) | Role field ignored/rejected. | |
| E-RBAC-10 | Guest reads another guest's booking by code | 403 `FORBIDDEN` (unless code is intended as a public capability – confirm with dev). | |
| E-RBAC-11 | Guest hits `PATCH /bookings/:code/confirm` | 403. | |
| E-RBAC-12 | Anonymous hits staff endpoints (`/reception/*`, `/finance/*`, `/management/*`) | 401. | |
| E-RBAC-13 | Owner not yet through setup calls other owner APIs | Blocked until setup is complete. | |
| E-RBAC-14 | Role change while logged in (owner demotes manager) | Takes effect no later than next request/refresh. | |
| E-RBAC-15 | Hidden UI vs API | Elements hidden in UI must also be rejected server-side. | |

## B4. Booking – date, availability and state edge cases

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-BKG-01 | Check-in in the past | Book with yesterday's date. | 400 `INVALID_DATE`; UI blocks past dates. | |
| E-BKG-02 | Check-in = today | Book today. | Allowed (or per policy – confirm). | |
| E-BKG-03 | Check-out = check-in | Same-day in/out. | 400 `INVALID_DATE_RANGE`. | |
| E-BKG-04 | Check-out before check-in | Reverse dates. | 400 `INVALID_DATE_RANGE`. | |
| E-BKG-05 | Invalid date formats | `31-12-2026`, `2026-13-01`, `2026-02-30`, `abc`, empty. | 400 validation error. | |
| E-BKG-06 | Leap day / month & year boundaries | `2028-02-29`; stay across 31 Dec → 1 Jan; across DST/timezone change. | Nights counted correctly; dates not shifted by timezone. | |
| E-BKG-07 | Very long stay | 365+ nights. | Handled or limited with clear message; total price correct. | |
| E-BKG-08 | Far-future date | Year 2100. | Handled sensibly. | |
| E-BKG-09 | Double booking – same bed, same dates | Two users book the same bed/dates. | Second gets 409 `BED_ALREADY_BOOKED`. | |
| E-BKG-10 | Overlap – partial | Existing 10–15; try 13–18, 8–11, 11–14, 9–16. | All rejected. | |
| E-BKG-11 | Back-to-back stays | Existing 10–15; try 15–18 and 8–10. | Allowed (check-out day = next check-in day). | |
| E-BKG-12 | Race condition | Two browsers click **Submit** at the same moment for the same bed. | Exactly one booking succeeds; other gets 409; no duplicates. | |
| E-BKG-13 | Double-click submit | Click submit repeatedly. | Only one booking created; button disabled during request. | |
| E-BKG-14 | Refresh on success page | Reload `/booking/success`. | No duplicate booking; sensible message if state lost. | |
| E-BKG-15 | Bed becomes unavailable mid-flow | Guest on review page; meanwhile owner sets bed to MAINTENANCE / another guest books it. | Submit fails with clear message (`BED_NOT_AVAILABLE`/409). | |
| E-BKG-16 | Unpublished property | Book a property after owner unpublishes it (stale page). | 404 `PROPERTY_NOT_FOUND`. | |
| E-BKG-17 | Inactive room / non-existent bed | Use ID of INACTIVE/MAINTENANCE room, bed not in room, ID `0`, `-1`, `999999999999`. | 404 with codes `ROOM_NOT_FOUND`/`BED_NOT_FOUND`; no 500. | |
| E-BKG-18 | Mismatched IDs | bedId from room X but roomId Y. | Rejected. | |
| E-BKG-19 | Gender policy | Male guest books a bed in a FEMALE-only room (and vice versa). | Blocked/warned per policy (record actual behaviour). | |
| E-BKG-20 | Guest details validation | Name 1 char / blank; phone invalid; email invalid; blank fields. | Field-level errors; cannot proceed. | |
| E-BKG-21 | Special characters in name | `O'Brien`, `José Ñúñez`, `李雷`, `<b>x</b>`, emoji. | Stored and rendered safely (escaped); no layout break. | |
| E-BKG-22 | Source field tampering | POST `source=HACK`. | 400; only WEB/WALK_IN/PHONE accepted. | |
| E-BKG-23 | Anonymous booking | Submit booking while signed out. | Either prompts sign-in or creates guest booking per spec; no 500. | |
| E-BKG-24 | Price tampering | Edit price/total in request body or local storage. | Server computes price; tampered value ignored. | |
| E-BKG-25 | Booking context lost | Clear storage mid-flow, then open `/booking/review`. | Redirected back to start with message; no crash. | |

### B4a. Booking state machine

| ID | From → Action | Expected | Result |
|---|---|---|---|
| E-STATE-01 | PENDING → Confirm | OK → CONFIRMED | |
| E-STATE-02 | PENDING → Reject (reason 4 chars) | 400 validation (min 5) | |
| E-STATE-03 | PENDING → Reject (reason 5 chars) | OK → REJECTED | |
| E-STATE-04 | CONFIRMED → Confirm again | 409 `INVALID_TRANSITION` | |
| E-STATE-05 | CONFIRMED → Reject | 409 `INVALID_TRANSITION` | |
| E-STATE-06 | REJECTED → Confirm | 409 | |
| E-STATE-07 | CANCELLED → Confirm / Reject / Cancel | 409 | |
| E-STATE-08 | COMPLETED → Cancel | 409 | |
| E-STATE-09 | Two owners confirm/reject the same booking simultaneously | One wins; other gets 409; consistent final state. | |
| E-STATE-10 | Guest cancels while owner confirms (race) | Consistent final state; no stuck bed. | |
| E-STATE-11 | Cancel after payment collected | Defined behaviour (refund prompt / blocked) – record. | |
| E-STATE-12 | Cancelled/rejected booking frees the bed | Same bed/dates now bookable by someone else. | |
| E-STATE-13 | Cancel by guest with mismatched `guestEmail` (anonymous cancel) | 403; booking unchanged. | |
| E-STATE-14 | Look up booking code: wrong case, spaces, SQL chars, empty, extremely long | 404 / validation; no 500. | |

## B5. Front desk, payments and refunds edge cases

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-FD-01 | Check-in a PENDING booking | Attempt check-in before confirmation. | Blocked with clear message. | |
| E-FD-02 | Check-in cancelled/rejected/completed booking | Attempt. | Blocked. | |
| E-FD-03 | Check-in twice | Check in an already checked-in booking. | Blocked/idempotent; no duplicate state. | |
| E-FD-04 | ID proof: only type or only number | Provide one without the other. | Rejected: "Provide both the ID document type and number". | |
| E-FD-05 | ID proof lengths | Type 1 char / 51 chars; number 2 / 101 chars. | Rejected outside 2–50 / 3–100. | |
| E-FD-06 | Check-in date mismatch | Check in well before / after booked date. | Per policy (warn/allow/block) – record. | |
| E-FD-07 | Check-out without check-in | Attempt. | Blocked. | |
| E-FD-08 | Check-out with outstanding balance | Attempt. | Warns/blocks per policy. | |
| E-PAY-01 | Amount = 0, negative, empty, text | Collect payment. | Rejected; must be positive. | |
| E-PAY-02 | Amount > 10,000,000 | Collect payment. | Rejected (max). | |
| E-PAY-03 | Decimals / precision | `100.005`, `0.01`, `99999.999`. | Rounded/rejected consistently; totals exact to the paisa. | |
| E-PAY-04 | Overpayment | Pay more than booking total. | Blocked or recorded as excess – record behaviour. | |
| E-PAY-05 | Split payments | 1 split, 5 splits, 6 splits, split with 0 amount, splits summing ≠ amount. | 1–5 accepted; 6 rejected; invalid amounts rejected. | |
| E-PAY-06 | Invalid method | `BITCOIN`, empty. | Rejected; only CASH/UPI/CARD/NET_BANKING/COD. | |
| E-PAY-07 | Neither amount+method nor splits | Submit empty. | Rejected: "Provide an amount and method, or a list of payment splits". | |
| E-PAY-08 | Duplicate transaction reference | Same UPI ref twice. | Defined behaviour (flag/reject) – record. | |
| E-PAY-09 | Double-click collect | Rapid double submit. | Only one payment recorded. | |
| E-PAY-10 | Payment on another hotel's booking | API with foreign bookingId. | 404/403. | |
| E-PAY-11 | Payment on cancelled booking | Attempt. | Blocked or handled per policy. | |
| E-REF-01 | Refund > amount paid | Request refund larger than payment. | Rejected. | |
| E-REF-02 | Refund reason < 5 chars | Request. | Rejected. | |
| E-REF-03 | Multiple refunds on same payment | Two partial refunds exceeding total. | Cumulative refunds can't exceed payment. | |
| E-REF-04 | Approve already-approved/rejected refund | Click again / replay API. | 409 or ignored; no double refund. | |
| E-REF-05 | Receptionist approves refund | API call. | 403. | |
| E-REF-06 | Approve action invalid | `action: "MAYBE"`. | 400. | |
| E-INV-01 | Invoice totals | Compare invoice vs payments vs booking total, taxes rounding. | Numbers reconcile exactly. | |
| E-INV-02 | Open another hotel's invoice by ID | `/invoices/<foreign id>`. | Not found/forbidden. | |
| E-GST-01 | Guest register: invalid phone/emergency phone/gender/DOB | `gender=X`, DOB `2030-01-01`, DOB `1800-01-01`, DOB format wrong. | Validation errors (DOB in future should be rejected – flag if not). | |
| E-GST-02 | Duplicate guest | Register same phone/email twice. | Duplicate warning or merge per policy. | |
| E-GST-03 | Long text | 1001-char address, 2001-char notes. | Rejected (limits 1000 / 2000). | |

## B6. Property / room / bed data edge cases

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-PRP-01 | Duplicate room number in a property | Add room `101` twice. | 409 `ROOM_EXISTS`. | |
| E-PRP-02 | Same room number in different property | Add `101` to another property. | Allowed. | |
| E-PRP-03 | Duplicate bed code in a room | Add `101-A` twice. | 409 `BED_CODE_EXISTS`. | |
| E-PRP-04 | Price validation | 0, negative, text, `1e9`, 2 decimals, very large. | Positive only; sensible max; formatting correct. | |
| E-PRP-05 | Room number > 50 chars / empty | Submit. | Rejected. | |
| E-PRP-06 | Floor | Negative (basement), 0, 200, decimal, text. | Integers accepted; decimal/text rejected. | |
| E-PRP-07 | Property name 1 char / 256 chars | Submit. | Rejected (2–255). | |
| E-PRP-08 | Property slug rules | Uppercase, spaces, special chars, duplicates, 1 char, > 150. | Rejected/normalised; duplicates blocked. | |
| E-PRP-09 | Deactivate room with future bookings | Set INACTIVE/MAINTENANCE. | Warning/blocked or bookings handled – record. | |
| E-PRP-10 | Mark bed MAINTENANCE with confirmed booking | Change status. | Defined behaviour – record. | |
| E-PRP-11 | Unpublish property with active bookings | Unpublish. | Existing bookings unaffected. | |
| E-PRP-12 | Edit/read non-existent or foreign room/bed | `PATCH /rooms/999999`, `/beds/<foreign>`. | 404. | |
| E-PRP-13 | Property with 0 rooms / room with 0 beds | View publicly; try to book. | Friendly empty state; not bookable. | |
| E-PRP-14 | Large dataset | 100+ properties/rooms, 500+ beds. | Pages load < 3 s; pagination works. | |
| E-PRP-15 | Image/logo upload | Upload 0-byte, > 500 KB (no storage key), > max size, `.exe`/`.svg`/`.gif`, wrong MIME, 10000×10000 px. | Invalid types/sizes rejected with clear error; SVG scripts not executed. | |
| E-PRP-16 | Owner setup field limits | Phone invalid, empty address, long description, HTML in description. | Validated; HTML escaped on public page. | |
| E-PRP-17 | Brand colour | Invalid hex, white-on-white. | Rejected; readable contrast. | |

## B7. Team / user management edge cases

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-TEAM-01 | Duplicate email for staff | Create user with existing email. | Clear error. | |
| E-TEAM-02 | Weak password for staff | 11 chars. | Rejected. | |
| E-TEAM-03 | Owner suspends self / last owner | Try. | Blocked. | |
| E-TEAM-04 | Manager suspends owner | Try via API. | 403. | |
| E-TEAM-05 | Suspend user with open duties (checked-in bookings) | Suspend. | Allowed; data intact; actions attributed in audit log. | |
| E-TEAM-06 | Staff created without `SUPABASE_SERVICE_ROLE_KEY` | Env without key. | Clear error/fallback message, no partial account. | |
| E-TEAM-07 | Same email at two hotels (staff) | Create staff with same email in A and B. | Rejected or isolated per design – record. | |

## B8. Platform console edge cases

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-PLT-01 | Empty/invalid owner email | Create hotel. | Validation errors; nothing created. | |
| E-PLT-02 | Owner email already used elsewhere | Reuse an email. | Clear error; no orphan hotel left behind. | |
| E-PLT-03 | Partial failure (email service down) | Simulate invite failure. | No half-created state, or clear recovery path. | |
| E-PLT-04 | Suspend already suspended / activate active | Repeat action. | Idempotent; no error. | |
| E-PLT-05 | Re-invite after owner accepted | Click Re-invite. | Allowed with warning or disabled. | |
| E-PLT-06 | Temp password shown once | Close dialog, reopen. | Cannot be viewed again. | |
| E-PLT-07 | Large number of hotels | 100+ hotels. | Table paginates/searches. | |
| E-PLT-08 | Hotel name edge values | Emoji, 255+ chars, only spaces, HTML. | Validated; HTML escaped. | |

## B9. Security tests

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-SEC-01 | XSS – stored | Put `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>` in guest name, complaint, feedback, property name, hotel description, rejection reason. | Rendered as text everywhere (UI, invoices, reports, emails, exports). | |
| E-SEC-02 | XSS – reflected | Place payloads in query strings (`?q=`, `?code=`). | Not executed. | |
| E-SEC-03 | SQL injection | `' OR 1=1--`, `1; DROP TABLE users` in search fields, booking code, IDs. | No error leak; no data change. | |
| E-SEC-04 | CSV/Excel injection in exports | Guest name `=HYPERLINK("http://x")`, `@SUM(1)`. | Export prefixes/escapes so formulas don't run. | |
| E-SEC-05 | CORS | Call API from an origin not in `CORS_ORIGINS`. | Blocked by browser; no wildcard. | |
| E-SEC-06 | Error leakage | Trigger 400/404/500 conditions. | No stack traces, SQL, or secrets in responses. | |
| E-SEC-07 | Secrets in client | Inspect bundle/network for service-role key, DB URL. | Only public anon key present. | |
| E-SEC-08 | Mass assignment | Add `role`, `tenant_id`, `status`, `price`, `payment_status` to request bodies. | Ignored/rejected. | |
| E-SEC-09 | HTTP methods | `DELETE`/`PUT` on endpoints not supporting them. | 404/405. | |
| E-SEC-10 | Rate limiting | Burst 100 requests on login/booking/forgot-password. | Throttled with 429 (or document absence). | |
| E-SEC-11 | Oversized payload | Send 10 MB JSON body. | Rejected 413. | |
| E-SEC-12 | Malformed JSON / wrong content-type | Send invalid JSON. | 400, not 500. | |
| E-SEC-13 | Path/URL tampering | `/%2e%2e/`, long URLs, unicode slugs. | Safe 404. | |
| E-SEC-14 | Open redirect | `?redirect=https://evil.com` after login. | Not followed to external domain. | |
| E-SEC-15 | Clickjacking / headers | Check headers. | `X-Frame-Options`/CSP, `X-Content-Type-Options`, HSTS present (Helmet). | |
| E-SEC-16 | Audit trail | Perform sensitive actions (role create, refund approve, settings). | Audit log captures actor, action, time; cannot be edited by owner. | |
| E-SEC-17 | Swagger docs exposure | Open `/api-docs` on production. | Disabled or acceptable by policy. | |
| E-SEC-18 | Camera / backup endpoints | Call as non-admin. | 403. | |

## B10. UI, UX, performance and resilience

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-UI-01 | API down | Stop backend; use app. | Error states with retry; no blank screens/infinite spinners. | |
| E-UI-02 | Slow network (3G throttle) | Navigate & submit. | Loading indicators; submit buttons disabled; no duplicate submits. | |
| E-UI-03 | Offline mid-action | Go offline during submit. | Error toast; data not lost; retry works. | |
| E-UI-04 | Render API cold start (Render free tier) | First request after idle. | UI tolerates 30–60 s delay with a loading message. | |
| E-UI-05 | Long content | 255-char names, long addresses, very long property names. | Truncated/wrapped; layout intact in cards, tables, invoices. | |
| E-UI-06 | Empty data everywhere | New hotel with no data. | Every list/dashboard shows empty state, no `NaN`/`undefined`/`Invalid Date`. | |
| E-UI-07 | Currency & number formatting | ₹ amounts, thousands separators, 0 and large values. | Consistent `₹` and formatting. | |
| E-UI-08 | Dates & timezones | User in different timezone (IST vs UTC−8). | Booking dates don't shift by a day. | |
| E-UI-09 | Browser back/forward/refresh | On every step of onboarding, booking, check-in. | No crashes or duplicate actions. | |
| E-UI-10 | Multiple tabs | Same user in two tabs; sign out in one. | Other tab handles it gracefully. | |
| E-UI-11 | Accessibility | Keyboard-only navigation, screen reader labels, contrast, focus rings, modals trap focus & close with Esc. | Meets basic WCAG AA. | |
| E-UI-12 | Zoom 200 % / text scaling | Browser zoom. | Usable without horizontal scroll. | |
| E-UI-13 | RTL / localisation | Hindi/Marathi characters in free-text fields. | Displayed correctly (UTF-8 end-to-end, incl. emails & PDFs). | |
| E-UI-14 | Camera permission denied | QR scanner with camera blocked or no camera. | Clear message; manual code entry fallback. | |
| E-UI-15 | Invalid QR | Scan unrelated QR / other hotel's QR. | "Invalid booking QR" – no crash, no cross-hotel load. | |
| E-UI-16 | Print / PDF layouts | Print invoice & report. | Page breaks sensible, no cut-off. | |
| E-UI-17 | Modal behaviour | Open modal, press Esc, click outside, refresh. | Closes cleanly; no stuck overlays/scroll lock. | |
| E-UI-18 | Pagination edge | Page 0, page beyond last, `pageSize=0/-1/10000` in URL/API. | Clamped or 400; no 500. | |
| E-UI-19 | Concurrent data refresh | Owner has Bookings open while guest books. | List updates on refresh/poll; no stale actions allowed (409 handled). | |
| E-UI-20 | Notifications overflow | 500+ notifications. | Panel scrolls/paginates; count caps sensibly (e.g. 99+). | |

## B11. Email / notification edge cases

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-NTF-01 | Invite/confirm/reset email content | Open each email. | Correct hotel name, working link to correct environment (not localhost on prod). | |
| E-NTF-02 | Email link expiry | Use link after the expiry window. | Clear "link expired" with resend option. | |
| E-NTF-03 | Email failure doesn't block action | Break SMTP; confirm a booking. | Booking still confirmed; failure logged; no 500 to user. | |
| E-NTF-04 | Spam/promotions folder | Check inbox placement. | Delivered to inbox (SPF/DKIM set up for prod). | |
| E-NTF-05 | Special chars in names | Guest name with accents/emoji in emails. | Correctly encoded. | |

## B12. Data integrity & reporting reconciliation

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| E-DATA-01 | Revenue reconciliation | Compare dashboard revenue vs sum of payments minus refunds for a period. | Exactly equal. | |
| E-DATA-02 | Occupancy accuracy | Compare occupancy % vs bed grid counts. | Matches. | |
| E-DATA-03 | Report date boundaries | Run report for single day, month boundary, from > to, future range. | Inclusive/exclusive logic consistent; invalid range rejected. | |
| E-DATA-04 | Report with no data | Run for empty period. | Zero values, no errors. | |
| E-DATA-05 | Cancelled/rejected excluded from revenue/occupancy | Create then cancel bookings. | Not counted. | |
| E-DATA-06 | Deleted/suspended user's historical records | Suspend staff and view past bookings/payments. | Records retained with correct attribution. | |
| E-DATA-07 | Audit log completeness | Run the full happy path; review audit log. | Every state change has an entry. | |
| E-DATA-08 | Timestamps | Compare created/updated times vs actual time (IST). | Correct timezone display. | |

---

## Appendix 1 – Useful API calls for negative testing

Replace `<TOKEN>` with the access token from DevTools → Application → Local Storage → `sb-…-auth-token` → `access_token`.

```sh
# Cross-hotel token reuse -> 403 TENANT_MISMATCH
curl -i -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: harbor-test" http://localhost:5000/api/v1/auth/me

# Public list with no hotel -> 400 TENANT_REQUIRED
curl -i http://localhost:5000/api/v1/properties

# Owner token on platform endpoint -> 403
curl -i -H "Authorization: Bearer <TOKEN>" http://localhost:5000/api/v1/platform/tenants

# Past-date booking -> 400 INVALID_DATE
curl -i -X POST http://localhost:5000/api/v1/bookings -H "Content-Type: application/json" -H "X-Tenant-Slug: sunrise-test" \
  -d '{"propertyId":1,"roomId":1,"bedId":1,"checkIn":"2020-01-01","checkOut":"2020-01-03","guestName":"QA Tester","guestPhone":"9876543210","guestEmail":"qa@example.com"}'

# Invalid phone -> 400
curl -i -X POST http://localhost:5000/api/v1/bookings -H "Content-Type: application/json" -H "X-Tenant-Slug: sunrise-test" \
  -d '{"propertyId":1,"roomId":1,"bedId":1,"checkIn":"2027-01-01","checkOut":"2027-01-03","guestName":"QA","guestPhone":"1234567890","guestEmail":"qa@example.com"}'

# Reject with short reason -> 400
curl -i -X PATCH http://localhost:5000/api/v1/bookings/<CODE>/reject -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"reason":"no"}'
```

## Appendix 2 – Suggested execution order

1. Smoke: PLT-01, PLT-02, ONB-01…05, AUTH-03, DISC-01, BKG-01, OWN-01.
2. Part A in area order (A1 → A13).
3. E-ISO and E-RBAC (security-critical) before the other edge sections.
4. E-BKG / E-STATE / E-PAY / E-REF (money and inventory correctness).
5. Remaining edge sections, then cross-browser and device passes.

## Appendix 3 – Exit criteria

- 100 % of Part A cases executed; ≥ 95 % PASS with no open Critical/High defects.
- All E-ISO, E-RBAC, E-BKG-09/12, E-PAY and E-REF cases PASS (no tenant leak, no double booking, no money mismatch).
- Automated suites green: `npm test`, `npm run lint`, `npm run build`, and Playwright e2e (`frontend/e2e`).

## Appendix 4 – Defect report template

```
ID / Title:
Environment / Build / Browser:
Role & Hotel:
Test case ID:
Steps to reproduce:
Expected result:
Actual result:
Severity (Critical/High/Medium/Low):
Attachments (screenshot, HAR, console log):
```
