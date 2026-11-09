import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Form'
import { Card } from '../components/ui/Card'
import { ErrorBanner, Skeleton } from '../components/ui/Feedback'
import { formatDate, initials } from '../lib/format'

export default function ProfilePage() {
  const { user, profile, saveProfile } = useAuth()

  const [fullName, setFullName] = useState('')
  const [course, setCourse] = useState('')
  const [bio, setBio] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<{ fullName?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Prefill once the profile arrives — but never overwrite edits in progress.
  useEffect(() => {
    if (!initialized && !dirty && profile) {
      setFullName(profile.full_name ?? '')
      setCourse(profile.course ?? '')
      setBio(profile.bio ?? '')
      setInitialized(true)
    }
  }, [profile, initialized, dirty])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaved(false)
    if (!fullName.trim()) {
      setErrors({ fullName: 'Name is required.' })
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await saveProfile({
        full_name: fullName.trim(),
        course: course.trim() || null,
        bio: bio.trim() || null,
      })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not save your profile. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900">Your profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        This is how other students see you in groups.
      </p>

      <Card className="mt-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800"
          >
            {initials(profile?.full_name ?? fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">
              {profile?.full_name || 'Unnamed member'}
            </p>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
            {profile?.created_at && (
              <p className="text-xs text-slate-500">Member since {formatDate(profile.created_at)}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        {formError && (
          <div className="mb-4">
            <ErrorBanner message={formError} />
          </div>
        )}

        {profile === null && !dirty && !initialized ? (
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                setDirty(true)
              }}
              error={errors.fullName}
              maxLength={80}
              autoComplete="name"
              required
            />
            <Input
              label="Course / major (optional)"
              value={course}
              onChange={(e) => {
                setCourse(e.target.value)
                setDirty(true)
              }}
              maxLength={80}
              placeholder="e.g. BS Computer Science — 2nd year"
            />
            <Textarea
              label="Bio (optional)"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value)
                setDirty(true)
              }}
              maxLength={280}
              rows={3}
              hint="A line or two about study goals, availability, or favorite subjects."
            />
            <div className="flex items-center justify-end gap-3">
              {saved && (
                <span role="status" className="text-sm font-medium text-emerald-700">
                  Saved!
                </span>
              )}
              <Button type="submit" loading={saving} disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
