import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../ui/Badge'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Modal } from '../ui/Modal'
import { ChevronRightIcon, MapPinIcon, TrashIcon, UsersIcon } from '../icons'
import { useAuth } from '../../context/AuthContext'
import { deleteSession, listRsvps, setRsvp } from '../../services/sessions'
import { formatDateTime, formatDuration, initials, isUpcoming } from '../../lib/format'
import type {
  RsvpStatus,
  RsvpWithProfile,
  SessionWithRsvp,
} from '../../lib/database.types'

const RSVP_OPTIONS: Array<{ value: RsvpStatus; label: string; activeClass: string }> = [
  { value: 'going', label: 'Going', activeClass: 'bg-emerald-700 text-white border-emerald-700' },
  { value: 'maybe', label: 'Maybe', activeClass: 'bg-amber-700 text-white border-amber-700' },
  {
    value: 'not_going',
    label: "Can't go",
    activeClass: 'bg-slate-600 text-white border-slate-600',
  },
]

/** One study session with RSVP toggles, attendee chips, and an attendee panel. */
export function SessionCard({
  session,
  onChanged,
}: {
  session: SessionWithRsvp
  onChanged: () => void
}) {
  const { user } = useAuth()
  const [rsvps, setRsvps] = useState<RsvpWithProfile[]>([])
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAttendees, setShowAttendees] = useState(false)
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
  const attendeeChips = rsvps.filter(
    (r) => r.status === 'going' || r.status === 'maybe',
  )

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-slate-900">{session.title}</h4>
            {past ? (
              <Badge variant="neutral">Past</Badge>
            ) : (
              <Badge variant="success">Upcoming</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {formatDateTime(session.starts_at)} · {formatDuration(session.duration_minutes)}
          </p>
          {session.location && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
              <MapPinIcon size={14} className="shrink-0" />
              {session.location}
            </p>
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
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 motion-reduce:transition-none"
          >
            <TrashIcon size={16} />
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>
      )}

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
                className={`min-h-[40px] rounded-full border px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 motion-reduce:transition-none ${
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

      {/* Attendee chips — click any chip (or the button) to open the full panel. */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        {attendeeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {attendeeChips.map((r) => (
              <button
                key={r.user_id}
                type="button"
                onClick={() => setShowAttendees(true)}
                aria-label={`${r.profiles?.full_name || 'Someone'} — ${r.status === 'going' ? 'going' : 'maybe'}. Open attendee list.`}
                className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                    r.status === 'going'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {initials(r.profiles?.full_name)}
                </span>
                <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">
                  {r.profiles?.full_name || 'Someone'}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAttendees(true)}
              className="ml-auto inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
            >
              <UsersIcon size={15} />
              View attendees
              <ChevronRightIcon size={14} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No RSVPs yet — responses will appear here as attendee profiles.
          </p>
        )}
      </div>

      <AttendeesPanel
        open={showAttendees}
        onClose={() => setShowAttendees(false)}
        sessionTitle={session.title}
        rsvps={rsvps}
      />

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

const PANEL_SECTIONS: Array<{
  status: RsvpStatus
  label: string
  emptyText: string
  badgeVariant: 'success' | 'warning' | 'neutral'
  avatarClass: string
}> = [
  {
    status: 'going',
    label: 'Going',
    emptyText: 'No one has confirmed yet.',
    badgeVariant: 'success',
    avatarClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    status: 'maybe',
    label: 'Maybe',
    emptyText: 'No maybes yet.',
    badgeVariant: 'warning',
    avatarClass: 'bg-amber-100 text-amber-800',
  },
  {
    status: 'not_going',
    label: "Can't go",
    emptyText: 'Nobody has declined.',
    badgeVariant: 'neutral',
    avatarClass: 'bg-slate-100 text-slate-700',
  },
]

/** The "next panel": full per-status breakdown with attendee profile rows. */
function AttendeesPanel({
  open,
  onClose,
  sessionTitle,
  rsvps,
}: {
  open: boolean
  onClose: () => void
  sessionTitle: string
  rsvps: RsvpWithProfile[]
}) {
  return (
    <Modal open={open} onClose={onClose} title={`Who's coming — ${sessionTitle}`}>
      <div className="space-y-4">
        {PANEL_SECTIONS.map((section) => {
          const attendees = rsvps.filter((r) => r.status === section.status)
          return (
            <section key={section.status}>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={section.badgeVariant}>
                  {section.label} ({attendees.length})
                </Badge>
              </div>
              {attendees.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {section.emptyText}
                </p>
              ) : (
                <ul className="list-none space-y-2 p-0">
                  {attendees.map((r) => (
                    <li key={r.user_id} className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${section.avatarClass}`}
                      >
                        {initials(r.profiles?.full_name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                        {r.profiles?.full_name || 'Someone'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </Modal>
  )
}
