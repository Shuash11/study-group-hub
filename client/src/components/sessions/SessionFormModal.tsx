import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Form'
import { ErrorBanner } from '../ui/Feedback'
import { useAuth } from '../../context/AuthContext'
import { createSession } from '../../services/sessions'

interface SessionFormModalProps {
  open: boolean
  onClose: () => void
  groupId: string
  onCreated: () => void
}

const DURATIONS = [30, 45, 60, 90, 120, 180]

function localMinValue(): string {
  const now = new Date(Date.now() - 60_000)
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

export function SessionFormModal({ open, onClose, groupId, onCreated }: SessionFormModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [duration, setDuration] = useState('60')
  const [location, setLocation] = useState('')
  const [details, setDetails] = useState('')
  const [errors, setErrors] = useState<{ title?: string; startsAt?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setTitle('')
    setStartsAt('')
    setDuration('60')
    setLocation('')
    setDetails('')
    setErrors({})
    setFormError(null)
  }

  // Fresh form on every open, matching the other modals (cancelled drafts don't linger).
  useEffect(() => {
    if (open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const nextErrors: typeof errors = {}
    if (!title.trim()) nextErrors.title = 'Give the session a title.'
    else if (title.trim().length > 80) nextErrors.title = 'Keep the title under 80 characters.'
    if (!startsAt) nextErrors.startsAt = 'Pick a date and time.'
    else if (new Date(startsAt).getTime() <= Date.now())
      nextErrors.startsAt = 'Pick a time in the future.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!user) {
      setFormError('You must be signed in to schedule a session.')
      return
    }

    setSaving(true)
    try {
      await createSession(groupId, user.id, {
        title: title.trim(),
        starts_at: new Date(startsAt).toISOString(),
        duration_minutes: Number(duration),
        location: location.trim() || null,
        details: details.trim() || null,
      })
      reset()
      onCreated()
      onClose()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule a study session">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <ErrorBanner message={formError} />}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          maxLength={80}
          placeholder="e.g. Midterm review — chapters 4–6"
          required
        />
        <Input
          label="Date & time"
          type="datetime-local"
          value={startsAt}
          min={localMinValue()}
          onChange={(e) => setStartsAt(e.target.value)}
          error={errors.startsAt}
          required
        />
        <div>
          <label
            htmlFor="session-duration"
            className="mb-1.5 block text-sm font-medium text-slate-800"
          >
            Duration
          </label>
          <select
            id="session-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition-colors focus:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d >= 60 ? `${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ''}` : `${d}m`}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Location or link (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={120}
          placeholder="e.g. Library room 204, or a Zoom link"
        />
        <Textarea
          label="Details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          placeholder="What should people bring or prepare?"
        />
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Schedule session
          </Button>
        </div>
      </form>
    </Modal>
  )
}
