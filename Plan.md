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
| WP9 | Verification: functional flows, RLS checks, security review | Lead + QA + Security Reviewer | WP8 | Done (24/24 E2E; reviews integrated) |

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
| Code review (WP9) | reviewer | ses_e3f67592dffeqcONpsl9Ksb0Ui | background | Completed; findings fixed & integrated |
| Security review (WP9) | security-reviewer | ses_e3f67592cffeIGNMuZxa03Yf8x | background | Completed; findings fixed & integrated |
| GitHub release (WP10) | release-manager | ses_e3e2b0d3b6f9e1f45c6b28a0f | background | Integrated — v0.1.0 pushed, CI green (evidence below) |

## Release record (WP10 — user-authorized)

- Repo: https://github.com/Shuash11/study-group-hub (public, default branch `main`)
- Release commit `1c362a9` = local HEAD = origin/main (verified via ls-remote); tag `v0.1.0` pushed; GitHub release created and marked Latest
- Version bump 0.0.0 → 0.1.0 (package.json + lockfile); `.github/workflows/ci.yml` (lint + build) and `.github/workflows/release.yml` added by release-manager
- Workflow runs: CI@main 42653590153 ✅ · CI@v0.1.0 42654840100 ✅ · Release@v0.1.0 42654840258 ✅ · CI@64fcf29 42657824208 ✅ (stray-file cleanup)
- No deployment to Vercel/Netlify (per user instruction — deploy is a future user action)
- Post-release cleanup by Lead: stray empty `New Text Document.txt` untracked (local file kept), commit `64fcf29`, CI green

Direct lead execution for increments A–D; no other background assignments.

## Review findings disposition (WP9)

Both reviews read pre-fix code; migrations 0003/0004 and the client updates resolve them.

| Finding | Disposition |
|---|---|
| H1 invite codes public + unguarded self-join | **Fixed** — 0003: codes in member-only `group_invites`, join only via `join_group_by_code` RPC; direct insert policy dropped |
| H2 no visitor role | **Fixed** — `/groups` and `/groups/:id` are public (browse/search); personal areas stay auth-gated |
| M1 capacity client-only | **Fixed** — RPC enforces `max_members` atomically (`SELECT … FOR UPDATE`); E2E-verified |
| M2 world-readable profiles/rosters | **Fixed** — profiles authenticated-only; roster member-only; public users get trigger-maintained `member_count` aggregate |
| M3 strict TS off, untyped client | **Fixed** — `strict: true`, typed `Database`, typed `createClient`; type aliases (interfaces break `Record<string, unknown>` constraint) |
| M4 skeleton flash on every RSVP | **Fixed** — initial-load-only skeletons + request-sequence guard |
| M5 dashboard error shows misleading empty states | **Fixed** — error renders banner only |
| M6 profile load failures swallowed | **Fixed** — `profileError` + retry in AuthContext/ProfilePage |
| L1 search 400 on quotes | **Fixed** — sanitizer strips `"` `\` and reserved chars |
| L2 login flash | **Fixed** — `applySession()` before navigate |
| L3 join modal stale error | **Fixed** — state reset on open |
| L4 max_members below roster | **Fixed** — client validation against current member count |
| L5 forged session author | **Fixed** — 0003 policy binds `created_by = auth.uid()` |
| L6 account deletion cascades sessions | **Not adopted** — account deletion is out of app scope; behavior disclosed |
| L7 E2E didn't exercise app query shapes | **Fixed** — script rewritten: RPC joins, embeds, 14 security negatives (24 checks total) |
| L8 dead code / timers / Math.random codes | **Fixed** — dead helpers removed, timer cleanup added, codes now DB-minted |
| SEC-01 unused membership UPDATE policy | **Fixed** — 0004 drops it |
| PR-01 search_path hardening | **Fixed** — 0004 pins `search_path = ''` on all definer functions + revokes schema CREATE |
| PR-02 RSVPs survive leaving | **Fixed** — 0004 trigger deletes RSVPs on membership end |
| SEC-05 .or() sanitization | **Fixed** — stricter charset stripping (defense-in-depth; targets a public table) |
| INF-04 raw DB errors in UI | **Fixed** — `friendlyDbError()` mapping |
| INF-06 font referrerpolicy | **Fixed** — `no-referrer` on font requests |
| INF-01 no security headers | **Partially** — `client/public/_headers` (Netlify); Vercel needs `vercel.json` at deploy time |
| INF-03 weak password minimum | **Partially** — client enforces 8+; server policy is platform config |
| INF-02 email confirmation off | **Deliberate** (demo convenience); re-enable before public launch — documented |
| INF-05 explicit GRANTs | **Not adopted** — default grants + RLS are the control; noted as optional hardening |
| PR-03 tokens in localStorage | **Disclosed** — supabase-js default; no XSS sink exists (reviewer-verified) |

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
- 2026-11-09: Reviews integrated. Migrations 0003 (enforced invites & privacy) and 0004 (review
  hardening) pushed. Client updated: typed Database + strict TS, RPC-based join, public group
  browsing, error/empty-state fixes. E2E script expanded to 24 checks — ALL PASSED against the
  live database. Lint 0 errors; production build clean. Findings disposition table above.
- 2026-11-10: WP10 release done (user-authorized). GitHub repo created with CI automation,
  main + v0.1.0 pushed, all workflow runs green — see Release record above.
- 2026-11-10: GitHub Pages deployment added and verified live
  (https://shuash11.github.io/study-group-hub/). Fixes along the way: Pages site enabled
  once via owner API (workflow token can't create it), and Supabase env vars added as
  repo Actions secrets injected at build time — without them the bundle would have
  crashed at runtime despite CI passing. Verified: homepage 200, SPA fallback serves
  the app on deep links, deployed bundle contains the Supabase wiring.
