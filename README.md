# Study Group Hub

A website where students **find, join, and run study groups** for their courses — with real
accounts and a real hosted PostgreSQL database. Built as a full-stack course project.

**Live stack:** React (Vite + TypeScript + Tailwind CSS) → Supabase (Auth + PostgreSQL with
Row Level Security) → deployed frontend.

## Features

- **Accounts** — email/password signup & login, editable profile (name, course, bio)
- **Groups** — create, edit, delete your group; browse and search all groups by name or
  course code; join with a 6-character invite code (validated and capacity-checked by the
  database itself); leave; live member lists
- **Sessions** — schedule study sessions (date/time, duration, location), RSVP
  *Going / Maybe / Can't go*, see exactly who is going and who is a maybe; creators can
  delete sessions
- **Group leader tools** — see the attendee list per session, and manage the roster:
  remove members (their RSVPs are cleaned up automatically; they can rejoin with the
  invite code)
- **Dashboard** — your groups and every upcoming session across them, with your RSVP state
- **Security** — authorization is enforced by the database itself (Row Level Security), not
  just hidden buttons. Non-members can't see a group's sessions, member roster, or invite
  code; joining happens only through a database function that checks the code and the
  capacity limit; nobody can join as an owner; only owners can edit or delete their group;
  profiles aren't readable by signed-out visitors.

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
  migrations/       versioned SQL schema (0001–0005: tables, RLS policies, triggers, enforced joins, owner member management)
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
RSVPs, then runs 31 end-to-end checks — signup → profile trigger → group create + invite
trigger → RPC join by code → sessions → RSVPs → leader member management → 18 security
negatives (invite-code secrecy, capacity enforcement, forged-author rejection, removal
protections, anon lockdown). Demo credentials are written to `.demo-credentials.txt`
(gitignored).

```bash
cd client
SUPABASE_SERVICE_KEY=<service_role key> WRITE_DEMO_CREDS=1 node scripts/seed-and-verify.mjs
```

## Deploy (frontend) — GitHub Pages ✅ live

**Live URL: https://shuash11.github.io/study-group-hub/**

Deploys automatically on every push to `main` via `.github/workflows/deploy.yml`:

- Vite `base` is `/study-group-hub/` and the router uses `import.meta.env.BASE_URL`,
  so assets and routes work under the Pages subpath.
- A build-time copy of `index.html` to `404.html` makes deep links
  (e.g. `/groups/<id>`) load the SPA (GitHub Pages serves it with a 404 status;
  browsers render it normally).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are repo Actions secrets baked in
  at build time (public-by-design values — RLS protects the data).
- First-time setup note: enabling Pages on a repo that never had it must be done
  once by the repo owner (`gh api -X POST repos/:owner/:repo/pages -f build_type=workflow`)
  — the workflow token can't create the site itself.
