import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Form'
import { ErrorBanner } from '../ui/Feedback'
import { useAuth } from '../../context/AuthContext'
import { friendlyDbError } from '../../lib/errors'
import { createGroup, updateGroup, type GroupInput } from '../../services/groups'
import type { Group } from '../../lib/database.types'

interface GroupFormModalProps {
  open: boolean
  onClose: () => void
  /** Receives the created group (create mode) or the updated id (edit mode). */
  onSaved: (group: Group) => void
  /** Provide an existing group to run the modal in edit mode. */
  initial?: Group | null
  /** Current roster size — the limit can never drop below it. */
  currentMemberCount?: number
}

function validate(values: { name: string; courseCode: string; maxMembers: string }) {
  const errors: { name?: string; courseCode?: string; maxMembers?: string } = {}
  if (!values.name.trim()) errors.name = 'Group name is required.'
  else if (values.name.trim().length > 80) errors.name = 'Keep the name under 80 characters.'
  if (!values.courseCode.trim()) errors.courseCode = 'Course code is required (e.g. CS 102).'
  else if (values.courseCode.trim().length > 20)
    errors.courseCode = 'Keep the course code under 20 characters.'
  const max = Number(values.maxMembers)
  if (!values.maxMembers || Number.isNaN(max) || !Number.isInteger(max))
    errors.maxMembers = 'Enter a whole number.'
  else if (max < 2 || max > 100) errors.maxMembers = 'Must be between 2 and 100.'
  return errors
}

/** Create and edit modal for groups (edit mode when `initial` is provided). */
export function GroupFormModal({
  open,
  onClose,
  onSaved,
  initial,
  currentMemberCount,
}: GroupFormModalProps) {
  const editing = Boolean(initial)
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [description, setDescription] = useState('')
  const [maxMembers, setMaxMembers] = useState('20')
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setCourseCode(initial?.course_code ?? '')
    setDescription(initial?.description ?? '')
    setMaxMembers(String(initial?.max_members ?? 20))
    setErrors({})
    setFormError(null)
  }, [open, initial])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const nextErrors = validate({ name, courseCode, maxMembers })
    // L4: an owner cannot shrink the limit below the existing roster.
    const max = Number(maxMembers)
    if (
      editing &&
      !nextErrors.maxMembers &&
      currentMemberCount !== undefined &&
      max < currentMemberCount
    ) {
      nextErrors.maxMembers = `This group already has ${currentMemberCount} members — set the limit to ${currentMemberCount} or more.`
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const input: GroupInput = {
      name: name.trim(),
      course_code: courseCode.trim().toUpperCase(),
      description: description.trim() || null,
      max_members: max,
    }

    setSaving(true)
    try {
      if (editing && initial) {
        await updateGroup(initial.id, input)
        onSaved({ ...initial, ...input })
      } else {
        if (!user) throw new Error('You must be signed in to create a group.')
        const group = await createGroup(user.id, input)
        onSaved(group)
      }
      onClose()
    } catch (err) {
      setFormError(friendlyDbError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit group' : 'Create a study group'}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <ErrorBanner message={formError} />}
        <Input
          label="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          maxLength={80}
          placeholder="e.g. Calculus 2 Survival Squad"
          required
        />
        <Input
          label="Course code"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
          error={errors.courseCode}
          maxLength={20}
          placeholder="e.g. MATH 202"
          required
        />
        <Input
          label="Max members"
          type="number"
          min={2}
          max={100}
          value={maxMembers}
          onChange={(e) => setMaxMembers(e.target.value)}
          error={errors.maxMembers}
          inputMode="numeric"
          required
        />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          placeholder="What will this group focus on? When do you usually meet?"
        />
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? 'Save changes' : 'Create group'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
