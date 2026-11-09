# Plan.md — Study Group Hub

Student side project: a React website where students find, join, and run study groups,
backed by a real hosted database (Supabase Cloud PostgreSQL).

## Goal & acceptance criteria

Build a functionally complete, deployed web app that real users can sign up for and use.

1. A visitor can sign up with email/password, log in, log out, and edit their profile.
2. A user can create a study group (name, course code, description, max members).
3. A user can browse/search all groups and join one via an invite code.
4. Group members can schedule study sessions and RSVP (going / maybe / not going).
5. A home dashboard shows the user's groups and upcoming sessions.
6. Data lives in Supabase cloud PostgreSQL with Row Level Security enforced — not localStorage.
7. The app is deployed to a public URL and works on mobile.

Non-goals: payments, chat/messaging, file uploads (v1), admin panel, email invites (stretch only).

## Users & roles

- **Visitor** — browse/search groups only (no personal data access).
- **Member (authenticated)** — full CRUD on own profile, own groups, own RSVPs.
- **Group owner** — additionally updates/deletes their group; is the group's `owner` member row.

## Database design (Supabase PostgreSQL + RLS)

| Table | Purpose | Key relations |
|---|---|---|
| `profiles` | one row per user (trigger-created from `auth.users`) | id = auth.users.id |
| `groups` | name, course_code, description, owner_id, max_members, join_code | owner → profiles |
| `group_members` | membership + role (owner/member) | many-to-many groups ↔ profiles |
| `study_sessions` | scheduled sessions per group | group_id → groups |
| `session_rsvps` | going/maybe/not_going per user per session | many-to-many sessions ↔ profiles |

Security model: RLS on every table; `is_group_member(group_id)` helper function;
owner-only update/delete on groups; sessions visible to group members only.
Trigger: new auth user → profile row. Trigger: new group → owner membership row.

## Tech stack (decided)

- React 19 + TypeScript via Vite (app in `client/`)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- `@supabase/supabase-js` — auth + database (cloud, free tier)
- Deploy: Vercel or Netlify (frontend) → Supabase cloud stays as backend
- Schema managed as versioned SQL in `supabase/migrations/` (CLI or Dashboard SQL Editor)

## Environment facts (verified)

- Windows, Node v24.14.0, npm 11.9.0, git 2.52.0, Supabase CLI 2.115.0, **no Docker**.
- Directory started empty (only `.opencode/` and a stray txt file) — greenfield project.
- User chose cloud Supabase directly; local CLI/Docker path abandoned.

## Work packages

| # | Package | Owner | Depends on | Status |
|---|---|---|---|---|
| WP1 | Scaffold Vite+React+TS+Tailwind, supabase client, repo init | Lead (direct) | — | Done |
| WP2 | Supabase cloud project created; schema/RLS migration applied | User + Lead | user account | Done |
| WP3 | Auth + profiles (signup/login/logout, profile edit, DB trigger) | Lead / Implementer | WP2 | Done |
| WP4 | Groups: create, browse, search, join by code, leave, member list | Lead / Implementer | WP3 | Done |
| WP5 | Sessions + RSVPs | Lead / Implementer | WP4 | Done |
| WP6 | Home dashboard (my groups, upcoming sessions) | Lead / Implementer | WP5 | Done |
| WP7 | Stretch: notes, activity feed, dark mode | Lead | WP6 | Deferred (optional) |
| WP8 | Polish, responsive, seed demo data, deploy to public URL | Lead | WP6 | Demo data done; deploy needs user's Vercel/Netlify account |
| WP9 | Verification: functional flows, RLS checks, security review | Lead + QA + Security Reviewer | WP8 | E2E passed; reviews running |

## Security requirements (mandatory triggers apply)

- Supabase Auth + RLS = authentication & authorization work → **security review required before completion** (workflow §6).
- Never expose `service_role` key or DB password; only the public `anon` key in frontend env.
- `.env.local` gitignored; `.env.example` committed without real values.

## Verification plan

- Manual happy path: signup → profile → create group → second account joins by code → schedule session → RSVP → dashboard shows both.
- Negative/edge: join code invalid, group full, non-owner edit attempt blocked (UI + RLS error), anon access blocked on member-only data.
- RLS spot checks (anon role / non-member user role) against Supabase.
- `npm run build` + TypeScript check pass; deployed URL smoke test.
- Security Reviewer assessment (auth + RLS triggers apply).

## Delegation ledger

| Task | Specialist | Session ID | Mode | Status |
|---|---|---|---|---|
| Code review (WP9) | reviewer | ses_e3f67592dffeqcONpsl9Ksb0Ui | background | Running |
| Security review (WP9) | security-reviewer | ses_e3f67592cffeIGNMuZxa03Yf8x | background | Running |

Direct lead execution for increments A–D; no other background assignments.

## Progress log

- 2026-11-09: Requirements confirmed (idea, scope, cloud Supabase, ~1 month). WP1 started.
- 2026-11-09: WP1 done — Vite+React+TS+Tailwind scaffolded in `client/`, supabase client wired,
  `.env.example` created, full schema + RLS in `supabase/migrations/0001_initial_schema.sql`.
  Waiting on user: Supabase cloud project (URL + anon key) to start WP2/WP3.
- 2026-11-09: WP2 done — Supabase project `jdisshdaajfbwafifhqv` (ap-southeast-1, ACTIVE_HEALTHY)
  created via CLI using the user's logged-in token. DB password stored in gitignored
  `.supabase-db-password.txt`. Migration 0001 applied via `supabase db push --db-url` (pooler
  connection; `link` is blocked by legacy-API deprecation on CLI v2.115). Fixed migration
  ordering bug: `is_group_member()` moved after `group_members` (Postgres validates SQL function
  bodies at creation). Verified all 5 tables via REST with anon key: profiles, groups,
  group_members, study_sessions, session_rsvps → all HTTP 200. `client/.env.local` written.
- 2026-11-09: Increments A–D built and committed (app shell/auth, groups, sessions+RSVPs+dashboard,
  profile editor). Migration 0002 pushed to cloud (member-role-only self-insert).
- 2026-11-09: Email confirmation disabled via management API (mailer_autoconfirm=true) —
  public signups now return sessions immediately; free-tier email rate limits no longer affect signups.
- 2026-11-09: WP9 functional verification PASSED — seed-and-verify.mjs: 15/15 checks green
  (signup, profile trigger, group create + owner trigger, session create, join by code, RSVP,
  RLS negatives: non-member blocked from sessions, self-insert-as-owner rejected, non-owner
  update blocked, anon locked out; E2E user cleaned up). Demo data seeded: 3 students,
  3 groups, 4 sessions, RSVPs. Demo creds in gitignored .demo-credentials.txt.
- 2026-11-09: README.md written. Reviewer + Security Reviewer launched in background (see ledger).
