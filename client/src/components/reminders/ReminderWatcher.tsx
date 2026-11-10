import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listUpcomingForUser } from '../../services/sessions'
import {
  checkSessionReminders,
  getReminderPermission,
  type ReminderPermission,
} from '../../lib/reminders'

const CHECK_INTERVAL_MS = 30_000

/**
 * Invisible component: while reminders are granted, polls the user's upcoming
 * sessions every 30s and fires tiered notifications (30 min / 5 min before).
 */
export function ReminderWatcher() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<ReminderPermission>(getReminderPermission())

  // Track permission changes made from the dashboard's Enable button.
  useEffect(() => {
    if (!('permissions' in navigator)) return
    let status: PermissionStatus | undefined
    navigator.permissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query({ name: 'notifications' as PermissionName })
      .then((s) => {
        status = s
        setPermission(
          s.state === 'prompt' ? 'default' : (s.state as ReminderPermission),
        )
        s.onchange = () =>
          setPermission(
            s.state === 'prompt' ? 'default' : (s.state as ReminderPermission),
          )
      })
      .catch(() => {
        /* permissions API unavailable — the dashboard state still updates on click */
      })
    return () => {
      if (status) status.onchange = null
    }
  }, [])

  useEffect(() => {
    if (!user || permission !== 'granted') return
    let cancelled = false
    let timer: number | undefined

    async function check() {
      if (cancelled || !user) return
      try {
        const upcoming = await listUpcomingForUser(user.id)
        if (cancelled) return
        checkSessionReminders(
          upcoming.map((s) => ({
            id: s.id,
            title: s.title,
            starts_at: s.starts_at,
            groupName: s.groups.name,
            location: s.location,
          })),
        )
      } catch {
        /* network hiccup — the next tick retries */
      }
    }

    void check()
    timer = window.setInterval(check, CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      if (timer !== undefined) clearInterval(timer)
    }
  }, [user, permission])

  return null
}
