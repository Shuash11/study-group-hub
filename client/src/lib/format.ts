// Shared formatting and small pure helpers.

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const DATE_ONLY = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** "Mon, Nov 10, 3:00 PM" (locale-aware). */
export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso))
}

/** "Nov 10, 2026". */
export function formatDate(iso: string): string {
  return DATE_ONLY.format(new Date(iso))
}

/** 90 -> "1h 30m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function isUpcoming(iso: string): boolean {
  return new Date(iso).getTime() > Date.now()
}

/** "Maria Santos" -> "MS" for avatar circles. */
export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}
