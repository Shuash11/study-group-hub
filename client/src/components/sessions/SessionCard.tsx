import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../ui/Badge'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { TrashIcon } from '../icons'
import { useAuth } from '../../context/AuthContext'
import { deleteSession, listRsvps, setRsvp } from '../../services/sessions'
import { formatDateTime, formatDuration, isUpcoming } from '../../lib/format'
import type { RsvpStatus, RsvpWithProfile, SessionWithRsvp } from '../../lib/database.types'

const RSVP_OPTIONS: Array<{ value: RsvpStatus; label: string; activeClass: string }> = [
  { value: 'going', label: 'Going', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'maybe', label: 'Maybe', activeClass: 'bg-amber-500 text-white border-amber-500' },
  {
    value: 'not_going',
    label: "Can't go",
    activeClass: 'bg-slate-600 text-white border-slate-600',
  },
]

/** One study session with RSVP toggles (and delete for its creator). */
export function SessionCard({
  session,
  groupName,
  onChanged,
}: {
  session: SessionWithRsvp
  /** Group name shown on the dashboard view. */
  groupName?: string
  onChanged: () => void
}) {
  const { user } = useAuth()
  const [rsvps, setRsvps] = useState<RsvpWithProfile[]>([])
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const past = !isUpcoming(session.starts_at)
  const isCreator = user?.id === session.created_by

  const loadRsvps = useCallback(() => {
    listRsvps(session.id)
      .then(setRsvps)
      .catch(() => setRsvps([]))
  }, [session.id])

  useEffect(() => {
    loadRsvps()
  }, [loadRsvps])

  async function toggle(status: RsvpStatus) {
    if (!user || saving) return
    setSaving(true)
    setError(null)
    try {
      await setRsvp(session.id, user.id, session.my_rsvp === status ? null : status)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your RSVP.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setError(null)
    try {
      await deleteSession(session.id)
      onChanged()
    } catch (err) {
      setShowDelete(false)
      setError(err instanceof Error ? err.message : 'Could not delete the session.')
    }
  }

  const counts = {
    going: rsvps.filter((r) => r.status === 'going').length,
    maybe: rsvps.filter((r) => r.status === 'maybe').length,
  }

  return (
    <li
      className={`rounded-lg border border-slate-200 bg-white p-4 ${past ? 'opacity-75' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-slate-900">{session.title}</h4>
            {past ? (
              <Badge variant="neutral">Past</Badge>
            ) : (
              <Badge variant="success">Upcoming</Badge>
            )}
            {groupName && <Badge variant="brand">{groupName}</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {formatDateTime(session.starts_at)} · {formatDuration(session.duration_minutes)}
          </p>
          {session.location && (
            <p className="mt-0.5 text-sm text-slate-500">📍 {session.location}</p>
          )}
          {session.details && (
            <p className="mt-1 text-sm text-slate-600">{session.details}</p>
          )}
        </div>
        {isCreator && (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            aria-label={`Delete session ${session.title}`}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 motion-reduce:transition-none"
          >
            <TrashIcon size={16} />
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!past &&
          RSVP_OPTIONS.map((opt) => {
            const active = session.my_rsvp === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                disabled={saving}
                onClick={() => toggle(opt.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 motion-reduce:transition-none ${
                  active
                    ? opt.activeClass
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        <span className="ml-auto text-xs text-slate-500">
          {counts.going} going · {counts.maybe} maybe
        </span>
      </div>

      {counts.going + counts.maybe > 0 && (
        <p className="mt-2 truncate text-xs text-slate-500">
          {rsvps
            .filter((r) => r.status === 'going' || r.status === 'maybe')
            .map((r) => r.profiles?.full_name || 'Someone')
            .join(', ')}
        </p>
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete this session?"
        message={`“${session.title}” and its RSVPs will be removed for everyone.`}
        confirmLabel="Delete session"
        danger
        onConfirm={handleDelete}
      />
    </li>
  )
}
