import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Building2,
  Calendar,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Receipt,
  Save,
  X,
} from 'lucide-react'
import { getEmail, updateEmail } from '../api/client'
import { ConfidenceBadge, DecisionBadge, EditedPill, IntentBadge, ModeBadge, UrgencyBadge } from '../components/badges'
import DecisionPanel from '../components/DecisionPanel'
import { Field, FieldGrid, SchemaCard } from '../components/SchemaCard'
import type {
  Cargo,
  Commercial,
  Dates,
  Parties,
  PartyInfo,
  References,
  ShipmentExtraction,
} from '../types/shipment'

export default function ShipmentDetailPage() {
  const { id } = useParams()
  const emailId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: record, isLoading } = useQuery({
    queryKey: ['email', emailId],
    queryFn: () => getEmail(emailId),
  })

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ShipmentExtraction | null>(null)

  useEffect(() => {
    if (record && !editing) setDraft(record.extraction)
  }, [record, editing])

  const saveMutation = useMutation({
    mutationFn: (extraction: ShipmentExtraction) => updateEmail(emailId, extraction),
    onSuccess: (updated) => {
      queryClient.setQueryData(['email', emailId], updated)
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      queryClient.invalidateQueries({ queryKey: ['decisions', emailId] })
      setDraft(updated.extraction)
      setEditing(false)
    },
  })

  if (isLoading || !record || !draft) {
    return (
      <div className="flex h-full items-center justify-center py-24 text-[var(--text-muted)]">
        <Loader2 className="mr-2 animate-spin" size={16} /> Loading…
      </div>
    )
  }

  function updateSection<S extends 'routing' | 'dates' | 'commercial' | 'references'>(
    section: S,
    field: keyof ShipmentExtraction[S],
    value: unknown,
  ) {
    setDraft((d) => (d ? { ...d, [section]: { ...(d[section] as object), [field]: value } } : d))
  }

  function updateCargoField<K extends keyof Cargo>(field: K, value: Cargo[K]) {
    setDraft((d) => (d ? { ...d, cargo: { ...d.cargo, [field]: value } } : d))
  }

  function updateParty(role: keyof Parties, field: keyof PartyInfo, value: string) {
    setDraft((d) =>
      d
        ? {
            ...d,
            parties: {
              ...d.parties,
              [role]: { ...d.parties[role], [field]: value },
            },
          }
        : d,
    )
  }

  function toNumberOrNull(v: string): number | null {
    if (v.trim() === '') return null
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }

  const extraction = draft
  const lowConfidence = extraction.email_meta.confidence_score < 0.7

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <IntentBadge intent={extraction.email_meta.intent} />
            <UrgencyBadge urgency={extraction.email_meta.urgency} />
            <ModeBadge mode={extraction.mode} />
            <ConfidenceBadge score={extraction.email_meta.confidence_score} />
            <DecisionBadge outcome={record.latest_decision?.outcome} />
            {record.edited && <EditedPill />}
          </div>
          <h1 className="text-xl font-semibold text-[var(--text)]">
            {extraction.routing.origin && extraction.routing.destination
              ? `${extraction.routing.origin} → ${extraction.routing.destination}`
              : extraction.references.booking_number || `Email #${record.id}`}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Received {new Date(record.created_at).toLocaleString()}
            {extraction.email_meta.sender_email ? ` · ${extraction.email_meta.sender_email}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => {
                  setDraft(record.extraction)
                  setEditing(false)
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text-muted)]"
              >
                <X size={15} /> Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate(draft)}
                disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Save corrections
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--text)]"
            >
              <Pencil size={15} /> Edit fields
            </button>
          )}
        </div>
      </div>

      {lowConfidence && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={16} />
          Low extraction confidence — please verify the fields below before acting on this
          shipment.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <SchemaCard title="Raw Email" icon={<FileText size={15} />}>
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--text-muted)]">
              {record.raw_text}
            </pre>
          </SchemaCard>
          {extraction.extraction_notes && (
            <div className="mt-4">
              <SchemaCard title="Extraction Notes">
                {editing ? (
                  <textarea
                    className="h-20 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    value={extraction.extraction_notes ?? ''}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, extraction_notes: e.target.value } : d))
                    }
                  />
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">{extraction.extraction_notes}</p>
                )}
              </SchemaCard>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <DecisionPanel emailId={record.id} decision={record.latest_decision} />

          <SchemaCard title="References" icon={<Receipt size={15} />}>
            <FieldGrid>
              {(
                [
                  ['booking_number', 'Booking #'],
                  ['po_number', 'PO #'],
                  ['shipper_reference', 'Shipper Ref'],
                  ['mbl_number', 'MBL #'],
                  ['hbl_number', 'HBL #'],
                  ['awb_number', 'AWB #'],
                ] as [keyof References, string][]
              ).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={extraction.references[key]}
                  editing={editing}
                  onChange={(v) => updateSection('references', key, v)}
                />
              ))}
            </FieldGrid>
          </SchemaCard>

          <SchemaCard title="Parties" icon={<Building2 size={15} />}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {(
                [
                  ['shipper', 'Shipper'],
                  ['consignee', 'Consignee'],
                  ['notify_party', 'Notify Party'],
                  ['forwarder', 'Forwarder'],
                ] as [keyof Parties, string][]
              ).map(([role, label]) => (
                <div key={role}>
                  <div className="mb-1 text-xs font-semibold text-[var(--text)]">{label}</div>
                  <Field
                    label="Name"
                    value={extraction.parties[role].name}
                    editing={editing}
                    onChange={(v) => updateParty(role, 'name', v)}
                  />
                  <Field
                    label="Address"
                    value={extraction.parties[role].address}
                    editing={editing}
                    onChange={(v) => updateParty(role, 'address', v)}
                  />
                  <Field
                    label="Contact"
                    value={extraction.parties[role].contact}
                    editing={editing}
                    onChange={(v) => updateParty(role, 'contact', v)}
                  />
                </div>
              ))}
            </div>
          </SchemaCard>

          <SchemaCard title="Routing" icon={<MapPin size={15} />}>
            <FieldGrid>
              <Field
                label="Origin"
                value={extraction.routing.origin}
                editing={editing}
                onChange={(v) => updateSection('routing', 'origin', v)}
              />
              <Field
                label="Destination"
                value={extraction.routing.destination}
                editing={editing}
                onChange={(v) => updateSection('routing', 'destination', v)}
              />
              <Field
                label="Incoterms"
                value={extraction.routing.incoterms}
                editing={editing}
                onChange={(v) => updateSection('routing', 'incoterms', v)}
              />
              <Field
                label="Transshipment Points"
                value={extraction.routing.transshipment_points.join(', ')}
                editing={editing}
                onChange={(v) =>
                  updateSection(
                    'routing',
                    'transshipment_points',
                    v
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
            </FieldGrid>
          </SchemaCard>

          <SchemaCard title="Cargo" icon={<Box size={15} />}>
            <FieldGrid>
              <Field
                label="Commodity"
                value={extraction.cargo.commodity_description}
                editing={editing}
                onChange={(v) => updateCargoField('commodity_description', v)}
              />
              <Field
                label="HS Code"
                value={extraction.cargo.hs_code}
                editing={editing}
                onChange={(v) => updateCargoField('hs_code', v)}
              />
              <Field
                label="Package Type"
                value={extraction.cargo.package_type}
                editing={editing}
                onChange={(v) => updateCargoField('package_type', v)}
              />
              <Field
                label="Package Count"
                value={extraction.cargo.package_count}
                editing={editing}
                onChange={(v) => updateCargoField('package_count', toNumberOrNull(v) as number)}
              />
              <Field
                label="Gross Weight (kg)"
                value={extraction.cargo.gross_weight_kg}
                editing={editing}
                onChange={(v) => updateCargoField('gross_weight_kg', toNumberOrNull(v) as number)}
              />
              <Field
                label="Net Weight (kg)"
                value={extraction.cargo.net_weight_kg}
                editing={editing}
                onChange={(v) => updateCargoField('net_weight_kg', toNumberOrNull(v) as number)}
              />
              <Field
                label="Volume (CBM)"
                value={extraction.cargo.volume_cbm}
                editing={editing}
                onChange={(v) => updateCargoField('volume_cbm', toNumberOrNull(v) as number)}
              />
            </FieldGrid>

            {extraction.cargo.containers.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-xs text-[var(--text-faint)]">Containers</div>
                <div className="flex flex-wrap gap-2">
                  {extraction.cargo.containers.map((c, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs text-[var(--text)]"
                    >
                      {c.quantity ?? ''}× {c.type ?? 'container'}
                      {c.container_number ? ` · ${c.container_number}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {extraction.cargo.hazmat.is_hazmat && (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                  Hazmat{extraction.cargo.hazmat.imo_class ? ` · IMO ${extraction.cargo.hazmat.imo_class}` : ''}
                </span>
              )}
              {extraction.cargo.temperature_controlled.required && (
                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                  Temp controlled{extraction.cargo.temperature_controlled.range_c ? ` · ${extraction.cargo.temperature_controlled.range_c}` : ''}
                </span>
              )}
              {extraction.cargo.oversized_or_breakbulk && (
                <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                  Oversized / Breakbulk
                </span>
              )}
            </div>
          </SchemaCard>

          <SchemaCard title="Dates" icon={<Calendar size={15} />}>
            <FieldGrid>
              {(
                [
                  ['cargo_ready_date', 'Cargo Ready'],
                  ['requested_etd', 'Requested ETD'],
                  ['requested_eta', 'Requested ETA'],
                  ['cutoff_date', 'Cutoff'],
                  ['delivery_deadline', 'Delivery Deadline'],
                ] as [keyof Dates, string][]
              ).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={extraction.dates[key]}
                  editing={editing}
                  onChange={(v) => updateSection('dates', key, v)}
                />
              ))}
            </FieldGrid>
          </SchemaCard>

          <SchemaCard title="Commercial" icon={<Receipt size={15} />}>
            <FieldGrid>
              <Field
                label="Requested Carrier"
                value={extraction.commercial.requested_carrier}
                editing={editing}
                onChange={(v) => updateSection('commercial', 'requested_carrier', v)}
              />
              <Field
                label="Freight Terms"
                value={extraction.commercial.freight_terms}
                editing={editing}
                onChange={(v) =>
                  updateSection(
                    'commercial',
                    'freight_terms',
                    v as Commercial['freight_terms'],
                  )
                }
              />
              <Field
                label="Quoted Rate"
                value={extraction.commercial.quoted_rate}
                editing={editing}
                onChange={(v) =>
                  updateSection('commercial', 'quoted_rate', toNumberOrNull(v))
                }
              />
              <Field
                label="Currency"
                value={extraction.commercial.currency}
                editing={editing}
                onChange={(v) => updateSection('commercial', 'currency', v)}
              />
            </FieldGrid>
          </SchemaCard>

          {extraction.attachments_referenced.length > 0 && (
            <SchemaCard title="Attachments Referenced" icon={<FileText size={15} />}>
              <div className="flex flex-wrap gap-1.5">
                {extraction.attachments_referenced.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs text-[var(--text)]"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </SchemaCard>
          )}
        </div>
      </div>
    </div>
  )
}
