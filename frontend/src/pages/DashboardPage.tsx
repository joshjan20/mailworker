import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Inbox, Search } from 'lucide-react'
import { listEmails } from '../api/client'
import {
  ConfidenceBadge,
  DecisionBadge,
  EditedPill,
  IntentBadge,
  ModeBadge,
  UrgencyBadge,
} from '../components/badges'
import type { Intent, ShipmentModeType } from '../types/shipment'

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-faint)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-[var(--text)]">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{hint}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data: emails, isLoading, isError, error } = useQuery({
    queryKey: ['emails'],
    queryFn: listEmails,
  })
  const [search, setSearch] = useState('')
  const [intentFilter, setIntentFilter] = useState<Intent | 'all'>('all')
  const [modeFilter, setModeFilter] = useState<ShipmentModeType | 'all'>('all')

  const filtered = useMemo(() => {
    if (!emails) return []
    return emails.filter((e) => {
      if (intentFilter !== 'all' && e.extraction.email_meta.intent !== intentFilter) return false
      if (modeFilter !== 'all' && e.extraction.mode !== modeFilter) return false
      if (search.trim()) {
        const haystack = [
          e.extraction.references.booking_number,
          e.extraction.references.po_number,
          e.extraction.parties.shipper.name,
          e.extraction.parties.consignee.name,
          e.extraction.routing.origin,
          e.extraction.routing.destination,
          e.raw_text,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [emails, search, intentFilter, modeFilter])

  const stats = useMemo(() => {
    if (!emails || emails.length === 0) {
      return { total: 0, needsReview: 0, avgConfidence: 0, autoConfirmEligible: 0 }
    }
    const needsReview = emails.filter((e) => e.extraction.email_meta.confidence_score < 0.7).length
    const avgConfidence =
      emails.reduce((sum, e) => sum + e.extraction.email_meta.confidence_score, 0) / emails.length
    const autoConfirmEligible = emails.filter(
      (e) => e.latest_decision?.outcome === 'auto_confirm',
    ).length
    return { total: emails.length, needsReview, avgConfidence, autoConfirmEligible }
  }, [emails])

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Shipment Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">
            AI-extracted shipment details from inbound operations emails
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total Processed" value={String(stats.total)} />
        <StatTile
          label="Auto-Confirm Eligible"
          value={String(stats.autoConfirmEligible)}
          hint="Deterministic gate, v1 ruleset"
        />
        <StatTile
          label="Needs Review"
          value={String(stats.needsReview)}
          hint="Model confidence < 70%"
        />
        <StatTile
          label="Avg. Confidence"
          value={stats.total ? `${Math.round(stats.avgConfidence * 100)}%` : '—'}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <Search size={15} className="text-[var(--text-faint)]" />
          <input
            className="w-56 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            placeholder="Search reference, party, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value as Intent | 'all')}
        >
          <option value="all">All intents</option>
          <option value="booking_request">Booking Request</option>
          <option value="quote_request">Quote Request</option>
          <option value="status_inquiry">Status Inquiry</option>
          <option value="document_request">Document Request</option>
          <option value="shipment_amendment">Amendment</option>
          <option value="general_inquiry">General Inquiry</option>
          <option value="other">Other</option>
        </select>
        <select
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value as ShipmentModeType | 'all')}
        >
          <option value="all">All modes</option>
          <option value="FCL">FCL</option>
          <option value="LCL">LCL</option>
          <option value="AIR">AIR</option>
          <option value="RAIL">RAIL</option>
          <option value="ROAD">ROAD</option>
          <option value="MULTIMODAL">MULTIMODAL</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {isLoading && (
          <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading emails…</div>
        )}
        {isError && (
          <div className="p-10 text-center text-sm text-red-500">
            Failed to load emails: {(error as Error).message}
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-14 text-center">
            <Inbox size={28} className="text-[var(--text-faint)]" />
            <p className="text-sm text-[var(--text-muted)]">
              {emails && emails.length > 0
                ? 'No emails match your filters.'
                : 'No emails processed yet. Submit one to get started.'}
            </p>
            <button
              onClick={() => navigate('/inbox')}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Submit an email
            </button>
          </div>
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-faint)]">
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Intent</th>
                <th className="px-5 py-3 font-medium">Mode</th>
                <th className="px-5 py-3 font-medium">Route</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Cargo Ready</th>
                <th className="px-5 py-3 font-medium">Confidence</th>
                <th className="px-5 py-3 font-medium">Decision</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => navigate(`/emails/${e.id}`)}
                  className="cursor-pointer border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]"
                >
                  <td className="px-5 py-3 whitespace-nowrap text-[var(--text-muted)]">
                    {new Date(e.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="flex flex-nowrap items-center gap-1.5">
                      <IntentBadge intent={e.extraction.email_meta.intent} />
                      <UrgencyBadge urgency={e.extraction.email_meta.urgency} />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <ModeBadge mode={e.extraction.mode} />
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-[var(--text)]">
                    {e.extraction.routing.origin || e.extraction.routing.destination ? (
                      <>
                        {e.extraction.routing.origin || '—'}
                        <span className="mx-1 text-[var(--text-faint)]">→</span>
                        {e.extraction.routing.destination || '—'}
                      </>
                    ) : (
                      <span className="text-[var(--text-faint)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-[var(--text-muted)]">
                    {e.extraction.references.booking_number ||
                      e.extraction.references.po_number || (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-[var(--text-muted)]">
                    {e.extraction.dates.cargo_ready_date || (
                      <span className="text-[var(--text-faint)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <ConfidenceBadge score={e.extraction.email_meta.confidence_score} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <DecisionBadge outcome={e.latest_decision?.outcome} compact />
                  </td>
                  <td className="px-5 py-3">{e.edited && <EditedPill />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
