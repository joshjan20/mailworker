import type { DecisionLog, EmailRecord, SampleEmail, ShipmentExtraction } from '../types/shipment'

const BASE = '/api/emails'

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export function listSamples(): Promise<SampleEmail[]> {
  return fetch(`${BASE}/samples`).then((r) => handle(r))
}

export function listEmails(): Promise<EmailRecord[]> {
  return fetch(BASE).then((r) => handle(r))
}

export function getEmail(id: number): Promise<EmailRecord> {
  return fetch(`${BASE}/${id}`).then((r) => handle(r))
}

export function extractEmail(rawText: string, senderEmail?: string): Promise<EmailRecord> {
  return fetch(`${BASE}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText, sender_email: senderEmail || null }),
  }).then((r) => handle(r))
}

export function updateEmail(id: number, extraction: ShipmentExtraction): Promise<EmailRecord> {
  return fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(extraction),
  }).then((r) => handle(r))
}

export function getDecisionHistory(id: number): Promise<DecisionLog[]> {
  return fetch(`${BASE}/${id}/decisions`).then((r) => handle(r))
}
