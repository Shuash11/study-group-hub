import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from '../icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** How long the exit animation runs before unmounting (ms). */
const EXIT_MS = 360

/**
 * Accessible dialog: Escape/backdrop to close, focus moved into the panel,
 * simple Tab trap, focus restored to the trigger on close.
 * Animates in AND out; reduced-motion users get instant show/hide instead
 * (the global reduced-motion rule zeroes the transition durations).
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const exitTimer = useRef<number | null>(null)
  const [rendered, setRendered] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Mount/unmount lifecycle with an exit window for the closing animation.
  useEffect(() => {
    if (open) {
      if (exitTimer.current !== null) {
        clearTimeout(exitTimer.current)
        exitTimer.current = null
      }
      setRendered(true)
      return
    }
    setShown(false)
    exitTimer.current = window.setTimeout(() => setRendered(false), EXIT_MS)
    return () => {
      if (exitTimer.current !== null) {
        clearTimeout(exitTimer.current)
        exitTimer.current = null
      }
    }
  }, [open])

  // Enter transition + focus management + keyboard handling.
  useEffect(() => {
    if (!rendered || !open) return

    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShown(true)),
    )

    const previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const firstField = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, select',
    )
    ;(firstField ?? panelRef.current)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [rendered, open])

  if (!rendered) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <div
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => onCloseRef.current()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-lg outline-none transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          shown
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-4 scale-[0.97] opacity-0'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-90 motion-reduce:transition-none"
          >
            <XIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
