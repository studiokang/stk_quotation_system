# Survey Quote System

설문 기반 맞춤 견적 시스템. 사용자가 설문에 응답하면 응답 내용을 기반으로 자동 견적서(PDF)를 생성하고 이메일로 발송합니다.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js App (apps/web)              │
│                                                          │
│  /survey?token=xxx                                       │
│    ├─ JWT 검증 → Survey + Questions 로드                  │
│    └─ SurveyForm (multi-step, client-side state)         │
│                                                          │
│  POST /api/survey/submit                                 │
│    ├─ Rate limit (3/token/hour)                          │
│    ├─ Zod validation                                     │
│    ├─ Response + Answers (DB transaction)                 │
│    └─ Fire-and-forget → /api/quote/generate              │
│                                                          │
│  POST /api/quote/generate                                │
│    ├─ Price calculation (engine.ts)                       │
│    ├─ Quote creation (DB)                                 │
│    └─ Async: PDF generation → Email delivery             │
│                                                          │
│  /result?responseId=xxx                                   │
│    ├─ Polling (3s interval, 60s timeout)                  │
│    └─ QuoteCard + PDF download                           │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
│   @repo/db       │  │   @repo/pdf      │  │  @repo/email │
│   Prisma Client  │  │   Puppeteer PDF  │  │  Resend      │
│   PostgreSQL     │  │   HTML template  │  │  HTML inline │
└──────────────────┘  └──────────────────┘  └──────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | PostgreSQL + Prisma |
| PDF | Puppeteer |
| Email | Resend |
| Validation | Zod |
| Logging | Pino |
| Rate Limiting | Upstash Redis |
| Monorepo | Turborepo + pnpm |

## Local Setup

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL 15+ (or Docker)
- Chromium (installed automatically by Puppeteer)

### 1. Clone and install

```bash
git clone <repo-url>
cd survey-quote-system
pnpm install
```

### 2. Database setup

```bash
# Option A: Docker
docker compose up -d

# Option B: Local PostgreSQL
createdb survey_quote
```

### 3. Environment variables

```bash
cp .env.example .env
# Edit .env with your values (see table below)
```

### 4. Database migration

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed      # Optional: load sample data
```

### 5. Start development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `RESEND_API_KEY` | Yes | Resend API key (https://resend.com/api-keys) |
| `EMAIL_FROM` | No | Sender email address (default: onboarding@studiokang.ai) |
| `NEXT_PUBLIC_BASE_URL` | Yes | Public URL of the application |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token |
| `INTERNAL_QUOTE_SECRET` | Yes | Min 32 chars; authenticates server-side `POST /api/quote/generate` |

## Project Structure

```
survey-quote-system/
├── apps/
│   └── web/                          # Next.js application
│       ├── app/
│       │   ├── survey/               # Survey renderer (/survey?token=xxx)
│       │   ├── result/               # Quote result page
│       │   ├── api/
│       │   │   ├── survey/submit/    # POST: submit survey answers
│       │   │   └── quote/
│       │   │       ├── generate/     # POST: trigger quote generation
│       │   │       └── [responseId]/ # GET: quote status + PDF download
│       │   ├── error.tsx             # Global error boundary
│       │   └── layout.tsx
│       ├── components/
│       │   ├── SurveyForm.tsx        # Multi-step survey form
│       │   ├── QuoteCard.tsx         # Quote display card
│       │   ├── QuotePolling.tsx      # Auto-refresh polling wrapper
│       │   └── questions/            # Question type components
│       └── lib/
│           ├── env.ts                # Zod environment validation
│           ├── prisma.ts             # DB client with retry + timeout
│           ├── jwt.ts                # JWT verify/sign with expiry
│           ├── logger.ts             # Pino structured logging
│           ├── validators.ts         # Zod schemas for all API inputs
│           ├── rate-limit.ts         # Upstash rate limiters
│           └── quote/engine.ts       # Quote calculation engine
├── packages/
│   ├── db/                           # Prisma schema + client
│   ├── pdf/                          # PDF generation (Puppeteer)
│   │   ├── src/template.ts           # A4 HTML quote template
│   │   └── src/generator.ts          # DB → HTML → PDF pipeline
│   └── email/                        # Email delivery (Resend)
│       └── src/sender.ts             # PDF attachment + survey invite sender
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## PDF Document Structure

The generated PDF follows A4 format (210mm × 297mm) with:

- **Header**: Company logo placeholder + quote number (QT-XXXXXXXX)
- **Meta section**: Quote info (number, date, validity) + client info (email, survey title)
- **Items table**: Line items with alternating row colors (항목 | 선택 | 금액)
- **Totals**: Subtotal → VAT (10%) → Grand total
- **Footer**: Validity notice + company info placeholder
- **Page numbers**: CSS `@page` counter

## Deployment

### Vercel + Supabase

1. **Database**: Create a Supabase project → copy the connection string
2. **Deploy**: Connect the repository to Vercel
3. **Environment**: Set all required env vars in Vercel dashboard
4. **Prisma**: Vercel auto-runs `prisma generate` via build command
5. **Puppeteer**: Use `@sparticuz/chromium` for serverless PDF generation

```bash
# Vercel build command
pnpm turbo build --filter=web

# Vercel output directory
apps/web/.next
```

### Important Notes

- Set `JWT_SECRET` to a cryptographically random string (min 32 chars)
- Puppeteer requires `--no-sandbox` in containerized environments
- Rate limiting requires Upstash Redis — gracefully degraded if not configured
- PDF files are stored in `/tmp/quotes/` — use persistent storage in production
- Set up a cron job to clean PDFs older than 30 days: `cleanupOldPDFs()`

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/survey/submit` | JWT token | Submit survey answers |
| POST | `/api/quote/generate` | Internal | Trigger quote generation |
| GET | `/api/quote/[responseId]` | responseId | Check quote status (polling) |
| GET | `/api/quote/[responseId]/pdf` | responseId | Download quote PDF |
