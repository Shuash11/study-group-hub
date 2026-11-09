import type { ReactNode } from 'react'

type Variant = 'brand' | 'neutral' | 'success' | 'warning' | 'outline'

const variantClasses: Record<Variant, string> = {
  brand: 'bg-brand-100 text-brand-800',
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  outline: 'border border-slate-300 text-slate-600',
}

export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: {
  variant?: Variant
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
