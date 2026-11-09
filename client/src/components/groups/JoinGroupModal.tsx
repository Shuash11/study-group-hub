import { useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Form'
import { ErrorBanner } from '../ui/Feedback'
import { useAuth } from '../../context/AuthContext'
import {
  AlreadyMemberError,
  GroupFullError,
  findGroupByCode,
  joinGroup,
} from '../../services/groups'
import type { Group } from '../../lib/database.types'

interface JoinGroupModalProps {
  open: boolean
  onClose: () => void
  onJoined: (group: Group) => void
}

export function JoinGroupModal({ open, onClose, onJoined }: JoinGroupModalProps) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const normalized = code.trim().toUpperCase()
    if (normalized.length !== 6) {
      setFieldError('Invite codes are 6 characters — ask the group owner for yours.')
      return
    }
    setFieldError(null)
    if (!user) {
      setFormError('You must be signed in to join a group.')
      return
    }

    setJoining(true)
    try {
      const group = await findGroupByCode(normalized)
      if (!group) {
        setFormError('No group found with that code. Double-check and try again.')
        return
      }
      await joinGroup(user.id, group)
      setCode('')
      onJoined(group)
      onClose()
    } catch (err) {
      if (err instanceof GroupFullError) setFormError(err.message)
      else if (err instanceof AlreadyMemberError) setFormError(err.message)
      else
        setFormError(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        )
    } finally {
      setJoining(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join with an invite code">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <ErrorBanner message={formError} />}
        <Input
          label="Invite code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          error={fieldError}
          maxLength={6}
          placeholder="e.g. K7P2XN"
          autoCapitalize="characters"
          spellCheck={false}
          className="tracking-[0.3em] font-mono text-center uppercase"
          required
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={joining}>
            Cancel
          </Button>
          <Button type="submit" loading={joining}>
            Join group
          </Button>
        </div>
      </form>
    </Modal>
  )
}
