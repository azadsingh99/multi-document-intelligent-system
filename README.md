# Multi-Document Intelligence Workbench

Banking-desk MVP that takes a set of customer files, extracts each one independently, and runs a collective review **without mixing sources**. Every finding is tied to a document id and filename. The model layer is an interface: a deterministic mock is the default; Grok (xAI) can be switched on later with an API key.

```
Upload → Extract → Store → Analyze → Structured results
```

## What it does

- Upload multiple **PDF, CSV, or TXT** files
- Extract text from each file and persist it as its own `documents` row
- Accept a reviewer prompt
- Analyze the selected documents together while preserving document boundaries
- Return structured output: **summary, key facts, discrepancies, missing information**, each with a **source document**
- Render results on a professional operations dashboard with **copy-to-clipboard**
- Reject unsupported, empty, binary, oversized, or spoofed files
- Sanitize stored filenames and send baseline security headers

## Architecture

```
frontend/          React + TypeScript + Vite dashboard
backend/           Express + TypeScript API
  src/ai           AIProvider interface, MockProvider, GrokProvider
  src/services     validation, extraction, document + analysis orchestration
  src/db           PostgreSQL pool and schema migration
sample-documents/  Four-file lending pack with planted inconsistencies
samples/           Extra fixtures (optional)
```

PostgreSQL tables:

| Table | Role |
| --- | --- |
| `documents` | One row per uploaded file, including extracted text |
| `analyses` | Prompt, status, timestamps |
| `analysis_documents` | Which documents belonged to an analysis |
| `analysis_results` | Structured JSON findings |

`AIProvider.analyze(prompt, documents)` is the only AI entry point. `createAIProvider()` returns `MockProvider` or `GrokProvider` from `AI_PROVIDER`. Findings that cite an unknown document id are stripped before they reach the client.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (Docker Compose **or** a local server)

## Quick start

```bash
cp .env.example .env
```

### 1. Start PostgreSQL

**Docker (recommended)**

```bash
npm run db:up
```

**Local PostgreSQL already installed**

Create the role and database to match `.env`:

```sql
CREATE USER mdis WITH PASSWORD 'mdis_dev_password';
CREATE DATABASE mdis OWNER mdis;
```

### 2. Install and run

```bash
npm install
npm run generate:pdf
npm run dev
```

- API: [http://localhost:3001](http://localhost:3001)
- Workbench: [http://localhost:5173](http://localhost:5173)

Health check: `GET http://localhost:3001/api/health`

### 3. Walk the demo file

Upload these four files from `sample-documents/`:

1. `01_q1_account_statement.txt`
2. `02_personal_loan_application.csv`
3. `03_kyc_customer_profile.txt`
4. `04_employment_verification.pdf`

Keep the default prompt and run analysis. You should see planted issues such as:

| Issue | Where it appears |
| --- | --- |
| Legal name **John Smith** vs **Jon Smith** | statement / application vs KYC |
| Account **1234567890** vs **1234567891** | statement vs KYC (also mentioned on the wire request) |
| Income **$80,000** vs **$120,000** | application / employment letter vs KYC |
| Address Boston vs Cambridge | statement vs KYC |
| Employer present only on the PDF letter | KYC and application leave employment blank |
| Tax ID absent across the file | KYC, application, statement, employment letter |

## Switching to Grok later

1. Create an xAI key at [https://console.x.ai](https://console.x.ai)
2. Put it in `.env`:

```env
AI_PROVIDER=grok
GROK_API_KEY=xai-your-key
GROK_MODEL=grok-3-latest
```

3. Restart the API. No frontend change is required.

The Grok provider sends each document inside an explicit boundary tag, asks for JSON only, and discards any finding whose `source.documentId` is not in the upload set. Until the key is present, leave `AI_PROVIDER=mock`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Process + database status |
| `POST` | `/api/documents` | Multipart field `files` — extract and store |
| `GET` | `/api/documents` | List stored documents |
| `POST` | `/api/analyses` | `{ prompt, documentIds }` — collective review |
| `GET` | `/api/analyses/:id` | Fetch a stored analysis |

Upload limits (configurable in `.env`): **10 MB** per file, **10** files per request, extensions **.pdf / .csv / .txt**. PDFs are checked for a `%PDF-` header. TXT/CSV files with null bytes are rejected. Stored names are UUID-prefixed and stripped of path characters.

## Development commands

```bash
npm test          # backend Vitest (grounding + file validation)
npm run typecheck
npm run build
```

The automated tests assert that the mock provider is deterministic, cites only supplied document ids/names, surfaces the planted account-number conflict, and does not invent facts. A second test covers invalid types, binary TXT, spoofed PDFs, and path-safe filenames.

## Secrets and deployment

- Copy `.env.example` to `.env` locally. **`.env` is gitignored and must never be committed.**
- Put `GROK_API_KEY`, database passwords, and any other credentials only in `.env`.
- `.env.example` contains placeholders only — no live keys.
- Uploaded files stay in `uploads/`, which is also gitignored.

## Environment

See `.env.example`. Important variables:

- `DATABASE_URL` — PostgreSQL connection string
- `AI_PROVIDER` — `mock` or `grok`
- `GROK_API_KEY` — used only when `AI_PROVIDER=grok`
- `MAX_FILE_SIZE_MB`, `MAX_FILES_PER_UPLOAD`, `UPLOAD_DIR`
- `CORS_ORIGIN` — dashboard origin in development

## Design constraints

- Findings are grounded in uploaded text. The mock extractor only emits labeled values it actually saw.
- Document boundaries stay intact: comparison happens after per-document extraction.
- A real LLM can replace the mock by implementing `AIProvider`; Grok is already wired.
