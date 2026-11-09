/**
 * Seed + end-to-end verification against the live Supabase project.
 *
 * Usage (from client/):
 *   SUPABASE_SERVICE_KEY=<service_role> node scripts/seed-and-verify.mjs
 *
 * What it does:
 *   1. Idempotently seeds demo users, groups, sessions and RSVPs (admin API).
 *   2. Runs end-to-end checks: real signup path, profile trigger, group
 *      creation + owner trigger, join by code, sessions, RSVPs, and RLS
 *      negative tests (non-member, role escalation, anon access).
 *   3. Cleans up the temporary E2E user (cascades all its data).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const clientRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function readEnvValue(key) {
  try {
    // Strip the UTF-8 BOM Windows PowerShell adds when writing the file.
    const raw = readFileSync(path.join(clientRoot, '.env.local'), 'utf8').replace(/^\uFEFF/, '')
    return (raw.match(new RegExp(`^${key}=(.*)$`, 'm')) || [])[1]?.trim()
  } catch {
    return undefined
  }
}

const URL_ = readEnvValue('VITE_SUPABASE_URL')
const ANON = readEnvValue('VITE_SUPABASE_ANON_KEY')
const SERVICE = process.env.SUPABASE_SERVICE_KEY
if (!URL_ || !ANON || !SERVICE) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const admin = createClient(URL_, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const fresh = () => createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } })

let failures = 0
let warnings = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  if (!ok) failures++
}
function warn(name, detail = '') {
  warnings++
  console.log(`WARN  ${name}${detail ? `  — ${detail}` : ''}`)
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || `Sgh-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}!`

const DEMO_USERS = [
  { email: 'ava@demo.studyhub.test', name: 'Ava Chen', course: 'BS Applied Mathematics' },
  { email: 'miguel@demo.studyhub.test', name: 'Miguel Santos', course: 'BS Computer Science' },
  { email: 'priya@demo.studyhub.test', name: 'Priya Nair', course: 'BS Physics' },
]

function futureDate(days, hour, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

async function ensureDemoUser({ email, name, course }) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 500 })
  const existing = list?.users?.find((u) => u.email === email)
  if (existing) return existing
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (error) throw new Error(`createUser(${email}): ${error.message}`)
  await admin.from('profiles').update({ full_name: name, course }).eq('id', data.user.id)
  return data.user
}

async function ensureGroup(name, courseCode, description, ownerId, maxMembers, joinCode) {
  const { data: existing } = await admin
    .from('groups')
    .select('*')
    .eq('name', name)
    .maybeSingle()
  if (existing) return existing
  const { data, error } = await admin
    .from('groups')
    .insert({
      name,
      course_code: courseCode,
      description,
      owner_id: ownerId,
      max_members: maxMembers,
      join_code: joinCode,
    })
    .select()
    .single()
  if (error) throw new Error(`ensureGroup(${name}): ${error.message}`)
  return data
}

async function ensureMember(groupId, userId, role) {
  const { data: existing } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) return
  const { error } = await admin.from('group_members').insert({ group_id: groupId, user_id: userId, role })
  if (error) throw new Error(`ensureMember: ${error.message}`)
}

async function ensureSession(groupId, createdBy, title, startsAt, duration, location) {
  const { data: existing } = await admin
    .from('study_sessions')
    .select('id')
    .eq('group_id', groupId)
    .eq('title', title)
    .maybeSingle()
  if (existing) return existing
  const { data, error } = await admin
    .from('study_sessions')
    .insert({
      group_id: groupId,
      created_by: createdBy,
      title,
      starts_at: startsAt,
      duration_minutes: duration,
      location,
    })
    .select()
    .single()
  if (error) throw new Error(`ensureSession(${title}): ${error.message}`)
  return data
}

async function ensureRsvp(sessionId, userId, status) {
  const { error } = await admin
    .from('session_rsvps')
    .upsert({ session_id: sessionId, user_id: userId, status })
  if (error) throw new Error(`ensureRsvp: ${error.message}`)
}

async function signInAs(email, client) {
  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD })
  if (error) throw new Error(`signIn(${email}): ${error.message}`)
}

async function seed() {
  console.log('— seeding demo data —')
  const users = []
  for (const u of DEMO_USERS) users.push(await ensureDemoUser(u))
  const [avaUser, miguelUser, priyaUser] = users

  const calc = await ensureGroup(
    'Calculus 2 Survival Squad',
    'MATH-202',
    'Weekly problem sets, exam reviews, and integral panic management. Bring snacks.',
    avaUser.id,
    12,
    'MTH2X7',
  )
  const cs = await ensureGroup(
    'Programming 2 Warriors',
    'CS-102',
    'Pair programming for machine problems. Java, but make it survivable.',
    miguelUser.id,
    8,
    'CS102P',
  )
  const phys = await ensureGroup(
    'Physics Night Owls',
    'PHY-110',
    'Late-night problem solving before every long exam.',
    priyaUser.id,
    6,
    'PHY110',
  )

  await ensureMember(calc.id, miguelUser.id, 'member')
  await ensureMember(calc.id, priyaUser.id, 'member')
  await ensureMember(cs.id, avaUser.id, 'member')
  await ensureMember(phys.id, priyaUser.id, 'owner') // no-op if exists (owner already there)

  const s1 = await ensureSession(
    calc.id, avaUser.id, 'Midterm review — chapters 4–6', futureDate(1, 19), 120, 'Library room 204',
  )
  const s2 = await ensureSession(
    calc.id, avaUser.id, 'Weekly problem set 8', futureDate(4, 18, 30), 90, 'Online (link in details)',
  )
  await ensureSession(cs.id, miguelUser.id, 'Machine problem 3 pair-up', futureDate(2, 16), 60, 'CS lab 3')
  await ensureSession(phys.id, priyaUser.id, 'Vectors recap', futureDate(-1, 20), 60, 'Study hall B')

  await ensureRsvp(s1.id, miguelUser.id, 'going')
  await ensureRsvp(s1.id, priyaUser.id, 'maybe')
  await ensureRsvp(s2.id, miguelUser.id, 'maybe')
  return { calc }
}

async function runE2E() {
  console.log('— end-to-end checks —')

  // 1. Real signup path (the exact call the app makes).
  const stamp = Date.now()
  const e2eEmail = `e2e.${stamp}@example.com`
  const signupClient = fresh()
  const { data: suData, error: suError } = await signupClient.auth.signUp({
    email: e2eEmail,
    password: 'E2eTest!123',
    options: { data: { full_name: 'E2E Tester' } },
  })
  check('signup via anon key succeeds', !suError, suError?.message)

  let e2eUser
  let client
  if (suData?.session) {
    e2eUser = suData.user
    client = signupClient
  } else {
    warn(
      'signup did not return a session (email confirmation still required)',
      'flip "Confirm email" off in Dashboard → Authentication → Sign In / Providers',
    )
    // Clean up the unconfirmed user, then create a confirmed one to continue.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 500 })
    const unconfirmed = list?.users?.find((u) => u.email === e2eEmail)
    if (unconfirmed) await admin.auth.admin.deleteUser(unconfirmed.id)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: e2eEmail,
      password: 'E2eTest!123',
      email_confirm: true,
      user_metadata: { full_name: 'E2E Tester' },
    })
    if (createError || !created.user) {
      check('create E2E user via admin API', false, createError?.message)
      return
    }
    e2eUser = created.user
    client = fresh()
    await signInAs(e2eEmail, client)
  }

  // 2. Profile trigger fired on signup.
  const { data: profile } = await client.from('profiles').select('*').eq('id', e2eUser.id).maybeSingle()
  check('profile auto-created with full_name from signup metadata', profile?.full_name === 'E2E Tester', `got "${profile?.full_name}"`)

  // 3. Group creation + owner-membership trigger.
  const joinCode = `E2E${String(stamp).slice(-3)}X`
  const { data: group, error: groupError } = await client
    .from('groups')
    .insert({
      name: `E2E Check Group ${stamp}`,
      course_code: 'E2E-101',
      description: 'Temporary group for automated verification.',
      owner_id: e2eUser.id,
      max_members: 5,
      join_code: joinCode,
    })
    .select()
    .single()
  check('authenticated user can create a group', !!group && !groupError, groupError?.message)

  const { data: ownerRow } = await client
    .from('group_members')
    .select('role')
    .eq('group_id', group.id)
    .eq('user_id', e2eUser.id)
    .maybeSingle()
  check('creator automatically becomes owner member (trigger)', ownerRow?.role === 'owner', `role: ${ownerRow?.role}`)

  // 4. Session creation by the owner.
  const { data: session, error: sessionError } = await client
    .from('study_sessions')
    .insert({
      group_id: group.id,
      created_by: e2eUser.id,
      title: 'E2E session',
      starts_at: futureDate(1, 15),
      duration_minutes: 60,
    })
    .select()
    .single()
  check('group member can create a session', !!session && !sessionError, sessionError?.message)

  // 5. Non-member cannot see sessions (RLS).
  const checkerClient = fresh()
  await ensureDemoUser({ email: 'checker@demo.studyhub.test', name: 'RLS Checker', course: null })
  await signInAs('checker@demo.studyhub.test', checkerClient)
  const { data: checkerUser } = await checkerClient.auth.getUser()
  const { data: beforeJoin } = await checkerClient
    .from('study_sessions')
    .select('id')
    .eq('group_id', group.id)
  check('non-member sees no sessions (RLS)', (beforeJoin ?? []).length === 0, `rows: ${(beforeJoin ?? []).length}`)

  // 6. Role-escalation blocked by migration 0002.
  const { data: physGroup } = await admin.from('groups').select('id').eq('name', 'Physics Night Owls').maybeSingle()
  const { error: escalateError } = await checkerClient
    .from('group_members')
    .insert({ group_id: physGroup.id, user_id: checkerUser.user.id, role: 'owner' })
  check('self-insert as owner is rejected (RLS)', !!escalateError)

  // 7. Owner-only group update blocked.
  const { data: hacked } = await checkerClient
    .from('groups')
    .update({ name: 'HACKED' })
    .eq('id', group.id)
    .select()
  check('non-owner cannot update a group (RLS)', (hacked ?? []).length === 0)

  // 8. Join by code works.
  const { data: foundByCode } = await checkerClient.from('groups').select('*').eq('join_code', joinCode).maybeSingle()
  check('group findable by invite code', foundByCode?.id === group.id)
  const { error: joinError } = await checkerClient
    .from('group_members')
    .insert({ group_id: group.id, user_id: checkerUser.user.id, role: 'member' })
  check('user can join a group as member', !joinError, joinError?.message)

  // 9. Member can now see sessions and RSVP.
  const { data: afterJoin } = await checkerClient
    .from('study_sessions')
    .select('id')
    .eq('group_id', group.id)
  check('member sees group sessions', (afterJoin ?? []).length === 1, `rows: ${(afterJoin ?? []).length}`)
  const { error: rsvpError } = await checkerClient
    .from('session_rsvps')
    .insert({ session_id: session.id, user_id: checkerUser.user.id, status: 'going' })
  check('member can RSVP', !rsvpError, rsvpError?.message)

  // 10. Anon access is locked down.
  const anonClient = fresh()
  const { data: anonSessions } = await anonClient.from('study_sessions').select('id').eq('group_id', group.id)
  check('anon sees no sessions (RLS)', (anonSessions ?? []).length === 0)
  const { data: anonProfile } = await anonClient.from('profiles').select('*').limit(1)
  check('anon can browse public profiles (by design)', Array.isArray(anonProfile))

  // 11. Cleanup — deleting the E2E user cascades all its data.
  const { error: delError } = await admin.auth.admin.deleteUser(e2eUser.id)
  check('E2E user cleaned up (cascade removes group, sessions, RSVPs)', !delError, delError?.message)
}

try {
  await seed()
  await runE2E()
} catch (err) {
  console.error('SCRIPT ERROR:', err.message)
  failures++
}

console.log('')
console.log(`Result: ${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} FAILED`} · ${warnings} warning(s)`)

if (process.env.WRITE_DEMO_CREDS) {
  writeFileSync(
    path.join(clientRoot, '..', '.demo-credentials.txt'),
    [
      'Study Group Hub — demo accounts (local file, gitignored)',
      `Password for all demo users: ${DEMO_PASSWORD}`,
      '',
      ...DEMO_USERS.map((u) => `${u.email}  —  ${u.name}`),
      '',
      'Signed-in demo accounts created by scripts/seed-and-verify.mjs',
    ].join('\n'),
  )
  console.log('Demo credentials written to .demo-credentials.txt (gitignored)')
}

process.exit(failures === 0 ? 0 : 1)
