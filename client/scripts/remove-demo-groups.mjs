/**
 * One-off cleanup: removes the three seeded demo groups.
 * Cascade removes their sessions, RSVPs, memberships and invite codes.
 * Demo USER accounts are kept (useful as second sign-in accounts for demos).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const clientRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const raw = readFileSync(path.join(clientRoot, '.env.local'), 'utf8').replace(/^\uFEFF/, '')
const url = (raw.match(/^VITE_SUPABASE_URL=(.*)$/m) || [])[1]?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) {
  console.error('Missing URL / SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_GROUPS = [
  'Calculus 2 Survival Squad',
  'Programming 2 Warriors',
  'Physics Night Owls',
]

for (const name of DEMO_GROUPS) {
  const { data: group } = await admin.from('groups').select('id').eq('name', name).maybeSingle()
  if (!group) {
    console.log('already gone:', name)
    continue
  }
  const { error } = await admin.from('groups').delete().eq('id', group.id)
  console.log(error ? `ERROR deleting ${name}: ${error.message}` : `deleted: ${name}`)
}

const { data: remaining } = await admin
  .from('groups')
  .select('name, course_code, member_count')
  .order('created_at', { ascending: false })
console.log('--- remaining groups ---')
console.log(remaining.length === 0 ? '(none)' : remaining.map((g) => `${g.name} [${g.course_code}] - ${g.member_count} members`).join('\n'))
