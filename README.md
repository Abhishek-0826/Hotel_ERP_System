# ROOST

Multi-tenant bed and room booking platform for hotels, hostels and PGs. Every hotel gets its own site at `/<hotel-slug>` with its own team, properties, rooms, beds and bookings. One platform admin (the ROOST team) creates hotels and invites their owners.

- **frontend/** – React + Vite + Tailwind (deployed on Vercel)
- **backend/** – Express + Prisma API (deployed on Render)
- **Supabase** – Postgres database and authentication

## Guides

| Guide | What it covers |
|---|---|
| [SETUP_AND_DEPLOYMENT_GUIDE.md](SETUP_AND_DEPLOYMENT_GUIDE.md) | Supabase setup, running locally, deploying to Render + Vercel |
| [HOTEL_ONBOARDING_AND_TESTING_GUIDE.md](HOTEL_ONBOARDING_AND_TESTING_GUIDE.md) | How hotels, owners and roles work, and the end-to-end test plan |

## Quick start (local)

Requirements: Node.js 20+ and a Supabase project.

```sh
npm run install:all                                   # installs both apps, generates the Prisma client
cp backend/.env.example backend/.env                  # PowerShell: Copy-Item ...; then fill in the values
cp frontend/.env.example frontend/.env
cd backend && npx prisma migrate deploy && cd ..      # creates the database schema
npm run dev:backend                                   # API       http://localhost:5000  (docs: /api-docs)
npm run dev:frontend                                  # frontend  http://localhost:5173
```

Then create the platform admin (`node scripts/make-admin.js <email>` in `backend/`) and sign in at `/platform/login`. The setup guide has every step, including the environment variables.

## Troubleshooting

- **`Cannot find module '.prisma/client/default'`** – run `cd backend && npx prisma generate`, then restart the API.
- **Database connection errors** – check `DATABASE_URL` in `backend/.env` (Supabase *Session pooler* string, no `?sslmode=`) and `DB_SSL=true`.
- **CORS errors** – `CORS_ORIGINS` must contain the exact frontend origin, with no trailing slash.

## Quality checks

```sh
npm run lint
npm test
npm run build
```

Never commit `.env` files or secrets; only the sanitised `.env.example` files belong in Git.
