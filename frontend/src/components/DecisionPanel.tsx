import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, History, XCircle } from 'lucide-react'
import { getDecisionHistory } from '../api/client'
import type { DecisionLog, FieldCheck } from '../types/shipment'
import { DecisionBadge } from './badges'
import { SchemaCard } from './SchemaCard'

function StatusIcon({ status }: { status: FieldCheck['status'] }) {
  if (status === 'ok') return <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
  if (status === 'implausible') return <XCircle size={14} className="shrink-0 text-red-600 dark:text-red-400" />
  return <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
}

function FieldChecklist({ checks }: { checks: FieldCheck[] }) {
  return (
    <div className="flex flex-col gap-2">
      {checks.map((c) => (
        <div key={c.field} className="flex items-start gap-2 text-sm">
          <StatusIcon status={c.status} />
          <div>
            <div className="font-medium text-[var(--text)]">
              {c.field} <span className="font-normal text-[var(--text-faint)]">— {c.value}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)]">{c.reason}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoryEntry({ log }: { log: DecisionLog }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <DecisionBadge outcome={log.outcome} />
        <span className="text-xs text-[var(--text-faint)]">
          {new Date(log.created_at).toLocaleString()}
        </span>
      </div>
      <p className="mb-2 text-xs text-[var(--text-muted)]">{log.reasoning}</p>
      <FieldChecklist checks={log.field_checks} />
    </div>
  )
}

export default function DecisionPanel({
  emailId,
  decision,
}: {
  emailId: number
  decision: DecisionLog | null
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const { data: history } = useQuery({
    queryKey: ['decisions', emailId],
    queryFn: () => getDecisionHistory(emailId),
  })

  const priorEntries = (history ?? []).filter((h) => h.id !== decision?.id)

  return (
    <SchemaCard title="Auto-Confirm Decision">
      {!decision ? (
        <p className="text-sm text-[var(--text-faint)]">No decision recorded.</p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <DecisionBadge outcome={decision.outcome} />
            <span className="text-xs text-[var(--text-faint)]">
              ruleset {decision.ruleset_version} · {new Date(decision.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mb-4 text-sm text-[var(--text)]">{decision.reasoning}</p>

          <div className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">
              Deterministic field checks
            </div>
            <FieldChecklist checks={decision.field_checks} />
          </div>

          {decision.model_notes && (
            <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">
                Model's stated reasoning — informational only, not used in this decision
              </div>
              <p className="text-sm text-[var(--text-muted)]">{decision.model_notes}</p>
              <p className="mt-1 text-xs text-[var(--text-faint)]">
                Self-reported extraction confidence: {Math.round(decision.model_confidence_score * 100)}%
              </p>
            </div>
          )}

          {priorEntries.length > 0 && (
            <div>
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]"
              >
                {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <History size={13} />
                Decision history ({priorEntries.length} prior evaluation
                {priorEntries.length === 1 ? '' : 's'})
              </button>
              {historyOpen && (
                <div className="mt-3 flex flex-col gap-3">
                  {priorEntries.map((log) => (
                    <HistoryEntry key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </SchemaCard>
  )
}
