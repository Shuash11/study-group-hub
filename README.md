# Study Group Hub

A website where students **find, join, and run study groups** for their courses — with real
accounts and a real hosted PostgreSQL database. Built as a full-stack course project.

**Live stack:** React (Vite + TypeScript + Tailwind CSS) → Supabase (Auth + PostgreSQL with
Row Level Security) → deployed frontend.

## Features

- **Accounts** — email/password signup & login, editable profile (name, course, bio)
- **Groups** — create, edit, delete your group; browse and search all groups by name or course
  code; join with a 6-character invite code; leave; live member lists
- **Sessions** — schedule study sessions (date/time, duration, location), RSVP
  *Going / Maybe / Can't go*, see who else is coming; creators can delete sessions
- **Dashboard** — your groups and every upcoming session across them, with your RSVP state
- **Security** — authorization is enforced by the database itself (Row Level Security), not
  just hidden buttons. Non-members can't see a group's sessions; nobody can join as an owner;
  only owners can edit or delete their group.

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS v4, React Router |
| Backend | Supabase (PostgreSQL, Auth, auto REST API) |
| Database security | Row Level Security policies + triggers (`supabase/migrations/`) |
| Hosting | Supabase cloud (data) + Vercel/Netlify (frontend) |

## Project structure

```
client/
  src/
    components/     UI library (buttons, forms, modals) + feature components
    pages/          5 screens (auth, home, groups, group detail, profile)
    services/       typed data access over supabase-js (auth, profiles, groups, sessions)
    context/        AuthContext — session + profile state
    lib/            supabase client, schema types, formatting helpers
  scripts/
    seed-and-verify.mjs   seeds demo data + runs 15 end-to-end checks
supabase/
  migrations/       versioned SQL schema (tables, RLS policies, triggers, indexes)
```

## Setup

1. **Supabase project** — create one at [supabase.com](https://supabase.com) (free tier).
2. **Apply the schema** — Supabase Dashboard → SQL Editor → paste each file in
   `supabase/migrations/` in order and run (or `supabase db push` with the CLI linked).
3. **Environment** — copy `client/.env.example` to `client/.env.local` and fill in your
   Project URL and **anon public** key (Dashboard → Project Settings → API).
   Never put the `service_role` key or DB password in the frontend.
4. **Run** —
   ```bash
   cd client
   npm install
   npm run dev
   ```
5. **(Recommended)** In Dashboard → Authentication → Sign In / Providers → Email, turn
   **"Confirm email" off** so test signups don't need email clicks.

## Demo data & self-check

`client/scripts/seed-and-verify.mjs` seeds three demo students with groups, sessions and
RSVPs, then runs 15 end-to-end checks (signup → profile trigger → group create → owner
trigger → join by code → RSVPs → RLS negative tests). Demo credentials are written to
`.demo-credentials.txt` (gitignored).

```bash
cd client
SUPABASE_SERVICE_KEY=<service_role key> WRITE_DEMO_CREDS=1 node scripts/seed-and-verify.mjs
```

## Deploy (frontend)

1. Push this repo to GitHub.
2. Import it on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Build command `npm run build`, root directory `client`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the dashboard's environment
   variables — then the deployed site talks to the same live database.
