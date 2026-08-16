export type Intent =
  | 'booking_request'
  | 'quote_request'
  | 'status_inquiry'
  | 'document_request'
  | 'shipment_amendment'
  | 'general_inquiry'
  | 'other'

export type Urgency = 'normal' | 'high'

export type ShipmentModeType =
  | 'FCL'
  | 'LCL'
  | 'AIR'
  | 'RAIL'
  | 'ROAD'
  | 'MULTIMODAL'
  | 'unknown'

export type FreightTerms = 'prepaid' | 'collect'

export interface EmailMeta {
  message_id: string | null
  received_at: string | null
  sender_email: string | null
  intent: Intent
  urgency: Urgency
  confidence_score: number
}

export interface PartyInfo {
  name: string | null
  address: string | null
  contact: string | null
}

export interface References {
  booking_number: string | null
  po_number: string | null
  shipper_reference: string | null
  mbl_number: string | null
  hbl_number: string | null
  awb_number: string | null
}

export interface Parties {
  shipper: PartyInfo
  consignee: PartyInfo
  notify_party: PartyInfo
  forwarder: PartyInfo
}

export interface Routing {
  origin: string | null
  destination: string | null
  transshipment_points: string[]
  incoterms: string | null
}

export interface ContainerInfo {
  type: string | null
  quantity: number | null
  container_number: string | null
  seal_number: string | null
}

export interface Hazmat {
  is_hazmat: boolean
  imo_class: string | null
  un_number: string | null
}

export interface TemperatureControlled {
  required: boolean
  range_c: string | null
}

export interface Cargo {
  commodity_description: string | null
  hs_code: string | null
  gross_weight_kg: number | null
  net_weight_kg: number | null
  volume_cbm: number | null
  package_count: number | null
  package_type: string | null
  containers: ContainerInfo[]
  hazmat: Hazmat
  temperature_controlled: TemperatureControlled
  oversized_or_breakbulk: boolean
}

export interface Dates {
  cargo_ready_date: string | null
  requested_etd: string | null
  requested_eta: string | null
  cutoff_date: string | null
  delivery_deadline: string | null
}

export interface Commercial {
  requested_carrier: string | null
  freight_terms: FreightTerms | null
  quoted_rate: number | null
  currency: string | null
}

export interface ShipmentExtraction {
  email_meta: EmailMeta
  references: References
  mode: ShipmentModeType
  parties: Parties
  routing: Routing
  cargo: Cargo
  dates: Dates
  commercial: Commercial
  attachments_referenced: string[]
  extraction_notes: string | null
}

export type FieldCheckStatus = 'ok' | 'missing' | 'implausible'
export type DecisionOutcome = 'auto_confirm' | 'escalate_to_ops'

export interface FieldCheck {
  field: string
  value: string
  status: FieldCheckStatus
  reason: string
}

export interface DecisionResult {
  outcome: DecisionOutcome
  field_checks: FieldCheck[]
  reasoning: string
  model_notes: string | null
  model_confidence_score: number
  ruleset_version: string
}

export interface DecisionLog extends DecisionResult {
  id: number
  created_at: string
}

export interface EmailRecord {
  id: number
  raw_text: string
  created_at: string
  edited: boolean
  extraction: ShipmentExtraction
  latest_decision: DecisionLog | null
}

export interface SampleEmail {
  label: string
  raw_text: string
}
