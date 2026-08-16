# Mailworker — Freight Forwarding Email Extraction

Simulated freight-forwarding AI ops tool: paste or upload a raw shipment email,
Claude extracts structured shipment details, and the results land in a
reviewable ops dashboard.

## Stack

- **Backend**: FastAPI + SQLAlchemy (SQLite) + Anthropic Claude (tool-use extraction)
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + React Query

## Setup

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Add your Anthropic API key to `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Run the API:

```bash
uvicorn app.main:app --reload
```

Runs on `http://127.0.0.1:8000`. Interactive docs at `/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api/*` to the backend.

## Usage

1. Open the app, go to **Submit Email**.
2. Load one of the sample emails or paste/upload your own raw email text.
3. Click **Extract Shipment Details** — this calls Claude and stores the
   structured result.
4. Review it on the **Dashboard**; click a row to see full extracted fields,
   the original email side-by-side, and correct any misextracted fields via
   **Edit fields**.

## Notes

- `email_meta.confidence_score` is the model's own self-reported estimate —
  treat it as a rough triage signal, not a calibrated probability.
- Records edited by an ops user are flagged "Ops-reviewed" and distinguished
  from raw AI output.
