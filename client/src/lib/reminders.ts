// Session start reminders via the Web Notifications API.
// Thresholds are tiered: one notification 30 minutes before, one 5 minutes
// before. Fired by ReminderWatcher while the app/PWA is open; delivered
// through the service worker when available (required on phones).

export type ReminderPermission = 'granted' | 'denied' | 'default' | 'unsupported'

/** Reminder thresholds in minutes before start. Add more here if wanted. */
export const REMINDER_MINUTES = [30, 5]

const DEDUP_PREFIX = 'sgh-notified'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getReminderPermission(): ReminderPermission {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission as ReminderPermission
}

/** Must be called from a user gesture (button click). */
export async function enableReminders(): Promise<ReminderPermission> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      /* some browsers reject without a gesture */
    }
  }
  return Notification.permission as ReminderPermission
}

function wasNotified(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function markNotified(key: string): void {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

async function showNotification(title: string, body: string, tag: string): Promise<void> {
  const iconUrl = `${import.meta.env.BASE_URL}icons/icon-512.png`
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      // Service worker path — the only one that works on installed phone apps.
      await registration.showNotification(title, { body, tag, icon: iconUrl, badge: iconUrl })
      return
    }
  } catch {
    /* fall through to the page-level API */
  }
  try {
    const notification = new Notification(title, { body, tag, icon: iconUrl })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch {
    /* unsupported context — ignore */
  }
}

export interface ReminderSession {
  id: string
  title: string
  starts_at: string
  groupName: string
  location: string | null
}

/**
 * Fires notifications for sessions inside any reminder window.
 * Idempotent per session + threshold (deduplicated in localStorage), so the
 * 30s poll never double-notifies and a page reload doesn't re-notify.
 */
export function checkSessionReminders(sessions: ReminderSession[]): void {
  if (getReminderPermission() !== 'granted') return
  const now = Date.now()

  for (const session of sessions) {
    const startsAt = new Date(session.starts_at).getTime()
    if (Number.isNaN(startsAt)) continue
    const minutesAway = (startsAt - now) / 60_000

    for (const minutes of REMINDER_MINUTES) {
      const key = `${DEDUP_PREFIX}:${session.id}:${minutes}`
      if (wasNotified(key)) continue
      if (minutesAway > 0 && minutesAway <= minutes) {
        markNotified(key)
        const label = minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`
        void showNotification(
          `${session.title} — starts in ${label}`,
          `${session.groupName}${session.location ? ` · ${session.location}` : ''}`,
          `reminder-${session.id}-${minutes}`,
        )
      }
    }
  }
}
