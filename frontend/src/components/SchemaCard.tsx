import type { ReactNode } from 'react'

export function SchemaCard({
  title,
  icon,
  children,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

export function Field({
  label,
  value,
  onChange,
  editing,
}: {
  label: string
  value: string | number | null | undefined
  onChange?: (v: string) => void
  editing?: boolean
}) {
  const display =
    value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="text-xs text-[var(--text-faint)]">{label}</span>
      {editing ? (
        <input
          className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <span
          className={`text-sm ${display === '—' ? 'text-[var(--text-faint)]' : 'text-[var(--text)]'}`}
        >
          {display}
        </span>
      )}
    </div>
  )
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-0 sm:grid-cols-3">{children}</div>
}
