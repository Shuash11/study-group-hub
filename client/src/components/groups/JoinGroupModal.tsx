import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Form'
import { ErrorBanner } from '../ui/Feedback'
import { joinGroupByCode } from '../../services/groups'

interface JoinGroupModalProps {
  open: boolean
  onClose: () => void
  onJoined: (groupId: string) => void
}

/**
 * Joining goes through the join_group_by_code RPC — the only membership
 * path the database allows — so code validation and capacity are enforced
 * server-side, not in this form.
 */
export function JoinGroupModal({ open, onClose, onJoined }: JoinGroupModalProps) {
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  // Fresh state on every open so a previous failure doesn't linger (L3).
  useEffect(() => {
    if (open) {
      setCode('')
      setFieldError(null)
      setFormError(null)
    }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const normalized = code.trim().toUpperCase()
    if (normalized.length !== 6) {
      setFieldError('Invite codes are 6 characters — ask the group owner for yours.')
      return
    }
    setFieldError(null)

    setJoining(true)
    try {
      const groupId = await joinGroupByCode(normalized)
      onJoined(groupId)
      onClose()
    } catch (err) {
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
