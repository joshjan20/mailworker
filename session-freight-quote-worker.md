# Session Log: Freight Forwarding AI Extraction — Mailworker

Record of the design decisions and build work for the `mailworker` project, an
end-to-end simulation of a freight-forwarding AI ops tool.

## 1. Goal

Simulate a freight-forwarding AI system: take raw inbound email text, extract
structured shipment details, surface them in an ops dashboard for review, and
(as the project evolved) gate whether an extraction is trustworthy enough to
auto-confirm a binding rate vs. escalate to a human — with every gate decision
logged for later audit.

## 2. Shipment schema (agreed early, used throughout)

Fields grouped as: `email_meta` (intent, urgency, confidence — the only
non-nullable group), `references` (booking/PO/MBL/HBL/AWB numbers), `mode`
(FCL/LCL/AIR/RAIL/ROAD/MULTIMODAL/unknown), `parties` (shipper/consignee/
notify/forwarder), `routing` (origin, destination, transshipment, incoterms),
`cargo` (commodity, HS code, weight/volume, containers, hazmat, temp-control,
oversized flag), `dates` (cargo ready/ETD/ETA/cutoff/delivery deadline),
`commercial` (carrier, freight terms, rate, currency), plus
`attachments_referenced` and free-text `extraction_notes`. Almost everything
is nullable — most emails only populate a fraction of the schema.

## 3. Stack

- **Backend**: Python, FastAPI, SQLAlchemy + SQLite, Anthropic Claude
  (forced tool-use for structured extraction)
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + React Router +
  TanStack Query
- Email input is paste/upload text — no live inbox integration (kept the demo
  self-contained, no OAuth/webhook complexity)

## 4. MVP build

- `backend/app/schemas.py` — the Pydantic schema mirroring the agreed field
  list, shared by extraction, storage, and the API (single source of truth)
- `backend/app/extraction.py` — one forced tool-use call to Claude per email;
  system prompt explicitly tells the model to leave fields null rather than
  guess, to not default to `booking_request`, to normalize dates it can parse,
  and to calibrate `confidence_score` against how sparse the email actually is
- `backend/app/routers/emails.py` — `POST /extract`, `GET /`, `GET /{id}`,
  `PUT /{id}` (ops corrections)
- `backend/app/sample_emails.py` — four canned demo emails (FCL booking, air
  quote, status inquiry, general correspondence) for one-click testing
- Frontend: sidebar-nav dashboard (stat tiles, filterable/searchable table),
  Inbox page (paste/upload + sample loader), Shipment Detail page (raw email
  side-by-side with grouped, editable extracted fields)

Verified live: FCL booking extracted correctly end-to-end (85% confidence);
a "thanks!" email correctly classified as `general_inquiry` at 15% confidence
with no hallucinated cargo/routing fields; ops-edit flow correctly flags a
record "Ops-reviewed" and persists corrections.

## 5. Extraction prompt walkthrough (key design points)

- Tool schema is generated directly from `ShipmentExtraction.model_json_schema()`
  — no hand-maintained duplicate schema.
- `tool_choice` is forced to the one tool, so output is always structured.
- System prompt rules exist specifically to counter known LLM failure modes:
  hallucinating plausible-but-wrong values, defaulting every email to
  "booking request," and confidence-score clustering near 0.8–0.9 regardless
  of content.
- Response is re-validated through the same Pydantic model before persisting
  (schema-valid tool output isn't guaranteed business-valid).
- `message_id`/`received_at`/`sender_email` are deterministically
  filled/overridden in code rather than trusted from the model.

## 6. Failure-mode / edge-case review

Walked through what happens on Claude API failures: SDK default is a 10-minute
timeout with 2 auto-retries on connection errors/408/409/429/5xx. Only
explicit `RuntimeError`s (missing key, non-compliant model response, schema
validation failure) were caught and turned into a clean `502`; genuine SDK
exceptions (`AuthenticationError`, `APITimeoutError`, `RateLimitError`,
`APIStatusError`) fell through to a generic unlogged `500` — flagged as a real
observability gap. Also discussed: no request size cap, no frontend fetch
timeout/cancel, no rate limiting on the extract endpoint, and that an
all-null low-confidence extraction is a silent (non-crashing) degradation
mode worth distinguishing from a true failure.

## 7. Auto-quote tradeoffs (design discussion)

Explored what changes when extraction feeds an **autonomous auto-quote**
rather than a human-reviewed dashboard:
- Self-reported LLM confidence is uncalibrated — risky to gate money-moving
  automation on it.
- Field-level risk matters more than one aggregate score (a wrong weight is
  not the same risk as a missing shipper reference).
- The LLM should extract inputs only; a separate deterministic engine should
  own pricing/bounds-checking — never let the model compute the money math.
- Silent-but-wrong is the dangerous failure mode, not loud API errors —
  business-rule validation must sit on top of schema validation, and failures
  should fail closed (escalate), never fail open (guess).
- Since inbound email is attacker-controlled text, prompt injection is a
  direct financial attack surface once extraction drives auto-quoting.
- User confirmed the target is a **binding rate confirmation**, not an
  indicative/soft quote — removing the "it's just an estimate" mitigation and
  pushing the design toward conservative, deterministic gating.

## 8. Confidence-gated escalation + auditable decision log (built)

Agreed approach: **hybrid** — a deterministic, code-defined rule engine makes
the auto-confirm/escalate decision; the model's own confidence/notes are
captured only as supporting context, never as the deciding signal. No
fabricated dollar figure (no real rate card exists in this simulation) —
decision-only output.

- `backend/app/gating.py` — five critical-field checks: `mode` (not
  `unknown`), `routing.origin`/`destination` (present, not identical),
  `cargo` sizing (weight or volume present and plausible; FCL requires
  containers), `commercial.freight_terms` (present), `dates.cargo_ready_date`
  (present). Any failing check → `escalate_to_ops`; all passing →
  `auto_confirm`. Bounds are explicitly illustrative, not real industry
  constants.
- `decision_logs` table — **append-only**, one row per extraction and per
  ops correction (`PUT`), so a correction that flips the outcome doesn't erase
  the original escalated decision. `GET /api/emails/{id}/decisions` exposes
  the full history.
- Frontend `DecisionPanel` — outcome badge, field-by-field checklist with
  reasons, the model's own `extraction_notes` visibly labeled "informational
  only, not used in this decision," and a collapsible decision-history list.
- Verified live: complete FCL booking → auto-confirm, all 5 checks pass;
  sparse email → escalate, all 5 checks fail with specific reasons; an air
  quote missing only `freight_terms` escalated on exactly that field, and
  after an ops correction via **Edit fields**, the decision flipped to
  auto-confirm while the original escalated entry remained intact in history.
- Along the way, fixed a real bug: the dashboard table's outer container used
  `overflow-hidden`, silently clipping extra columns instead of making them
  scrollable — changed to a scoped `overflow-x-auto` wrapper.

## 9. UI polish pass

- Fixed a flex min-width leak (`App.tsx`'s `<main>` had no `min-w-0`), which
  was forcing the whole page wider than the viewport instead of letting the
  table's own scroll container contain the overflow.
- Added `whitespace-nowrap` across all badge components so intent/mode/
  confidence/decision pills render on one line instead of wrapping to 2-3
  lines in table cells.
- Added a `compact` mode to `DecisionBadge` ("Auto-Confirm" / "Escalated" on
  the dashboard vs. the fuller wording on the detail page).
- Shortened the gate's `reasoning` summary from a long run-on sentence
  ("Escalated: field — reason; field — reason; ...") to a scannable one-liner
  ("N of 5 critical checks failed: field, field, ..."), since the detailed
  per-field reasons already live in the checklist below it.

## 10. Test emails used for stress-testing extraction

Four intentionally messy quote-request emails were generated to probe edge
cases: a terse mobile-typed one with rounded/uncertain weight, a forwarded
reply-chain with buried content and non-standard incoterm phrasing, a
multi-line RFQ with two commodities and imperial units against a metric
schema, and a very short one with no dates and open currency. Used to confirm
the model degrades gracefully (leaves fields null, drops confidence) rather
than hallucinating structure onto ambiguous input.

## Current state

Both dev servers were left running during the session:
`uvicorn app.main:app --port 8000` (backend) and `npm run dev` (frontend,
port 5173). `backend/.env` holds the user's own `ANTHROPIC_API_KEY` (not
committed). SQLite DB at `backend/mailworker.db`.
