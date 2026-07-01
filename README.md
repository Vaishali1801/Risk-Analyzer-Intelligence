# Contract Risk Analyzer

Portfolio-grade AI web application for enterprise contract review. It analyzes PDF/DOCX contracts, extracts structured risks, applies deterministic decision logic, and exports an executive-ready PDF report.

## What It Demonstrates

- Premium enterprise SaaS landing page and analysis workflow
- Real PDF/DOCX text extraction through a server API route
- Controlled GenAI pipeline using OpenAI only, not agents
- JSON-only prompting, Zod validation, one retry, and safe fallback
- Rule-based Accept / Renegotiate / Reject decision logic outside the model
- Dashboard, filterable risk table, clause deep dive, editable safer wording, and PDF report export
- Demo mode that works without an API key

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- React Hook Form + Zod
- OpenAI Node SDK
- Recharts
- pdf-parse + mammoth
- jsPDF

## Setup

Install Node.js 20+ first, then run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

PowerShell equivalent:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Add your OpenAI key in `.env.local`:

```bash
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

Optional RAG ingestion infrastructure variables for the script-only admin path:

```bash
RAG_DATABASE_URL=postgresql://user:password@host:5432/database
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

The RAG ingestion script defaults to dry-run mode and does not connect to Postgres or call OpenAI unless run with `--live` after seed documents are explicitly approved for ingestion.

Open `http://localhost:3000`.

## Validation Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run probe:knowledge-seed
npm run probe:knowledge-ingest-ready
npm run probe:rag-sql
npm run probe:knowledge-ingest-script
```

## Product Flow

1. Open the landing page.
2. Upload a PDF/DOCX contract or choose demo mode.
3. Server extracts and preprocesses text.
4. Long documents are chunked before prompting.
5. OpenAI returns JSON-only structured analysis.
6. Zod validates output. If invalid, the system retries once.
7. Deterministic decision logic recalculates final recommendation.
8. UI renders dashboard, risk table, deep dive, and report preview.
9. User downloads the final PDF report.

## Architecture

- `app/api/analyze/route.ts`: upload endpoint and end-to-end orchestration
- `lib/parsers`: PDF/DOCX extraction and preprocessing
- `lib/ai/analyzeContract.ts`: chunking, prompt construction, OpenAI call, JSON repair, validation
- `lib/ai/decision.ts`: explainable rule-based recommendation logic
- `schemas/contract-analysis.ts`: Zod schema for all rendered AI output
- `hooks/use-contract-analysis.ts`: client workflow state for uploads, pasted text, demo mode, and homepage handoff
- `components`: landing page, upload flow, dashboard, risk table, deep dive, and report
- `data/demo-contract.ts`: authoritative demo contract text and fixture analysis
- `app/api/demo/route.ts`: fixture-backed demo analysis endpoint for the homepage flow
- `app/api/demo/document/route.ts`: authoritative demo document endpoint used by "View demo doc"

## Reliability Notes

- Uploaded contracts require `OPENAI_API_KEY`.
- Demo mode uses a centralized fixture-backed API route that returns the same contract shape as live analysis.
- The UI never renders unvalidated OpenAI output.
- Unsupported, empty, oversized, and low-text files return user-safe errors.
- If model output cannot be validated after retry, the API returns a conservative validated fallback instead of malformed content.
