import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

// Form controls that own their label, hint and error association (WCAG 3.3.x).

interface FieldShellProps {
  label: string
  error?: string | null
  hint?: string
  inputId: string
  children: React.ReactNode
}

function FieldShell({ label, error, hint, inputId, children }: FieldShellProps) {
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function controlClasses(error?: string | null): string {
  return [
    'w-full rounded-lg border bg-white px-3 text-sm text-slate-900',
    'placeholder:text-slate-400 transition-colors motion-reduce:transition-none',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    error ? 'border-red-400 focus-visible:ring-red-500' : 'border-slate-300',
  ].join(' ')
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = '', ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} error={error} hint={hint} inputId={inputId}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`${controlClasses(error)} h-11 ${className}`}
        {...props}
      />
    </FieldShell>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string | null
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = '', rows = 3, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} error={error} hint={hint} inputId={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`${controlClasses(error)} py-2.5 ${className}`}
        {...props}
      />
    </FieldShell>
  )
})
