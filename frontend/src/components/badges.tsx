import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { DecisionOutcome, Intent, ShipmentModeType, Urgency } from '../types/shipment'

const INTENT_LABELS: Record<Intent, string> = {
  booking_request: 'Booking Request',
  quote_request: 'Quote Request',
  status_inquiry: 'Status Inquiry',
  document_request: 'Document Request',
  shipment_amendment: 'Amendment',
  general_inquiry: 'General Inquiry',
  other: 'Other',
}

const INTENT_STYLES: Record<Intent, string> = {
  booking_request:
    'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  quote_request:
    'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  status_inquiry:
    'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  document_request:
    'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  shipment_amendment:
    'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  general_inquiry:
    'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
}

export function IntentBadge({ intent }: { intent: Intent }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${INTENT_STYLES[intent]}`}
    >
      {INTENT_LABELS[intent]}
    </span>
  )
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency !== 'high') return null
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
      Urgent
    </span>
  )
}

export function ModeBadge({ mode }: { mode: ShipmentModeType }) {
  if (mode === 'unknown') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-md border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--text-faint)]">
        Unknown
      </span>
    )
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tracking-wide text-[var(--text)]">
      {mode}
    </span>
  )
}

export function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  let style = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
  if (pct < 40) {
    style = 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
  } else if (pct < 70) {
    style = 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${style}`}
    >
      {pct}%
    </span>
  )
}

export function EditedPill() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[var(--accent-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
      Ops-reviewed
    </span>
  )
}

export function DecisionBadge({
  outcome,
  compact,
}: {
  outcome: DecisionOutcome | undefined | null
  compact?: boolean
}) {
  if (!outcome) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-faint)]">
        No decision
      </span>
    )
  }
  if (outcome === 'auto_confirm') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        <CheckCircle2 size={12} /> {compact ? 'Auto-Confirm' : 'Auto-Confirm Eligible'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
      <AlertCircle size={12} /> {compact ? 'Escalated' : 'Escalated to Ops'}
    </span>
  )
}
