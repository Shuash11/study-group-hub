/** Maps raw database/Supabase errors to messages safe and useful in the UI. */
export function friendlyDbError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const message = err instanceof Error ? err.message : String(err ?? '')
  if (message.includes('row-level security'))
    return "You don't have permission to do that."
  if (message.includes('duplicate key')) return 'That already exists.'
  if (message.includes('violates check constraint')) return 'That value is not allowed.'
  if (message.includes('Failed to fetch') || message.includes('NetworkError'))
    return 'Network problem — check your connection and try again.'
  return message || fallback
}
