<div align="center">

# NeuroApply AI

**Intelligent job application automation — from profile to submitted form in seconds.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%20+%20pgvector-4169E1?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Overview](#overview) · [Architecture](#architecture) · [Quick Start](#quick-start) · [API Reference](#api-reference) · [Contributing](#contributing)

</div>

---

## Overview

NeuroApply AI is a full-stack job application assistant that eliminates the repetitive work of filling out job application forms. A Chrome extension detects LinkedIn Easy Apply modals, extracts form fields, and resolves answers through a multi-layer intelligence pipeline — pulling from your structured profile, learned answer history, and LLM inference when needed.

**What it does:**

- Detects LinkedIn Easy Apply modals automatically
- Fills text fields, dropdowns, radio buttons, and checkboxes
- Converts salary formats intelligently (e.g. `6 LPA` → `600000`)
- Learns from your manual corrections and reuses them in future applications
- Resolves most fields from cache in under 1ms on repeat visits

---

## Architecture

NeuroApply AI is composed of three independent layers that communicate over a REST API:

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Content     │  │ Field        │  │ Autofill Engine       │  │
│  │ Script      │→ │ Extractor    │→ │ (React-compatible)    │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
│         │                                                        │
│  ┌──────▼──────┐                                                 │
│  │ Service     │  (local answer cache + API client)              │
│  │ Worker      │                                                 │
└──┴──────┬──────┴─────────────────────────────────────────────── ┘
          │ HTTP (JWT)
┌─────────▼───────────────────────────────────────────────────────┐
│  FastAPI Backend                                                  │
│                                                                   │
│  POST /api/v1/resolve                                             │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Redis   │→ │ Profile  │→ │   Answer    │→ │ LLM Infer   │  │
│  │  Cache   │  │   DB     │  │   History   │  │ (gpt-4o-m.) │  │
│  └──────────┘  └──────────┘  └─────────────┘  └─────────────┘  │
│                                                                   │
│  PostgreSQL + pgvector · Redis · OpenAI                          │
└───────────────────────────────────────────────────────────────── ┘
          │
┌─────────▼───────────────────────────────────────────────────────┐
│  Next.js Dashboard (localhost:3000)                               │
│  Profile editor · Resume upload · Application history            │
└───────────────────────────────────────────────────────────────── ┘
```

### Field Resolution Pipeline

Every form field runs through this chain until an answer is found:

| Priority | Source | Latency | Description |
|----------|--------|---------|-------------|
| 1 | **Redis Cache** | < 1ms | Previously resolved answer, keyed by user + field hash |
| 2 | **Structured Profile** | 1–5ms | Direct column lookup — name, email, salary, LinkedIn URL, etc. |
| 3 | **Answer History** | 5–10ms | Fuzzy-matched question from past applications |
| 4 | **LLM Inference** | 200–500ms¹ | Full profile sent to GPT-4o-mini for semantic resolution |
| 5 | **Unknown** | — | Left blank; highlighted for manual entry |

> ¹ First occurrence only. LLM answers are cached in Redis and resolve in < 1ms on repeat.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Chrome Extension | Manifest V3, Vanilla JS |
| Backend | Python 3.13, FastAPI, async SQLAlchemy |
| Database | PostgreSQL 17 + pgvector extension |
| Cache | Redis (answer cache + profile cache + RAG cache) |
| LLM | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Auth | JWT (access + refresh tokens, bcrypt passwords) |
| Observability | Structured JSON logging, OpenTelemetry tracing |

---

## Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 17+ with [pgvector](https://github.com/pgvector/pgvector) |
| Redis | 7+ |
| OpenAI API Key | — |

---

### 1. Clone & configure

```bash
git clone https://github.com/SHISHIR1507/NeuroApply-AI.git
cd NeuroApply-AI/backend
cp .env.example .env
```

Open `.env` and set at minimum:

```env
OPENAI_API_KEY=sk-...
JWT_SECRET_KEY=your-random-secret   # generate with: openssl rand -hex 32
```

---

### 2. Start PostgreSQL and Redis

**macOS (Homebrew):**

```bash
brew services start postgresql@17
brew services start redis

# One-time database setup
psql postgres -c "CREATE USER neuroapply WITH PASSWORD 'neuroapply_dev';"
psql postgres -c "CREATE DATABASE neuroapply OWNER neuroapply;"
psql neuroapply -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Docker (alternative):**

```bash
docker compose up -d   # starts PostgreSQL + Redis
```

---

### 3. Run the backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
# {"status": "healthy", "service": "NeuroApply AI", "version": "0.1.0"}
```

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 4. Run the dashboard (optional)

```bash
cd frontend
npm install
npm run dev
# Dashboard available at http://localhost:3000
```

---

### 5. Load the Chrome extension

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. Copy your extension ID from the extensions page
5. Add it to `backend/.env`:

```env
CORS_ORIGINS=["chrome-extension://YOUR_EXTENSION_ID","http://localhost:3000"]
```

6. Restart the backend

---

### 6. Set up your profile

1. Register at [http://localhost:3000/register](http://localhost:3000/register)
2. Complete your profile at `/dashboard/profile` — the more fields you fill, the fewer LLM calls are needed
3. Upload your resume at `/dashboard/resume`
4. Click the NeuroApply AI icon in Chrome, log in, and enable the toggle

---

## Usage

1. Open any LinkedIn job posting and click **Easy Apply**
2. NeuroApply AI detects the modal and fills all resolvable fields automatically
3. A notification appears showing how many fields were filled
4. Review and correct any field — your correction is saved immediately and used in all future applications
5. Click **Next** to advance to the next page — fields are filled automatically on every step

> **Important:** If you reload the extension, refresh the LinkedIn tab before using Easy Apply to avoid context invalidation errors.

---

## Project Structure

```
NeuroApply-AI/
│
├── extension/                        Chrome Extension (Manifest V3)
│   ├── manifest.json
│   └── src/
│       ├── content/
│       │   ├── content.js            Orchestrator — modal detection, MutationObserver
│       │   ├── fieldExtractor.js     DOM label extraction (aria, for/id, parent traversal)
│       │   ├── autofill.js           React-compatible form filling engine
│       │   └── content.css           Field highlight styles
│       ├── background/
│       │   └── background.js         Service worker — API client, local answer cache
│       └── popup/
│           ├── popup.html            Quick login, toggle, resume upload shortcut
│           ├── popup.js
│           └── popup.css
│
├── backend/                          FastAPI Backend
│   └── app/
│       ├── main.py                   Application entry point + lifespan
│       ├── config.py                 Pydantic settings (env-driven)
│       ├── models.py                 SQLModel table definitions
│       ├── database.py               Async SQLAlchemy engine + session factory
│       ├── api/
│       │   ├── schemas.py            Pydantic request/response models
│       │   ├── deps.py               JWT auth dependency injection
│       │   └── routes/
│       │       ├── auth.py           Register / login / refresh
│       │       ├── profile.py        CRUD profile
│       │       ├── resolve.py        Batch field resolution (hot path)
│       │       ├── resume.py         Upload + async parse
│       │       ├── feedback.py       User correction learning loop
│       │       └── chat.py           Conversational profile setup
│       ├── services/
│       │   ├── resolver.py           5-layer field resolution engine
│       │   ├── field_mapper.py       Fuzzy label → canonical key (rapidfuzz)
│       │   ├── openai_client.py      Async OpenAI wrapper (chat + embeddings)
│       │   ├── cache.py              Redis operations (answers, profiles, RAG)
│       │   ├── resume_parser.py      PDF/DOCX extraction + structured parsing
│       │   └── vector_store.py       pgvector similarity search
│       └── core/
│           ├── security.py           JWT creation/validation + bcrypt
│           ├── logging.py            Structured JSON logging
│           ├── tracing.py            OpenTelemetry spans
│           └── exceptions.py         HTTP exception helpers
│
├── frontend/                         Next.js 14 Dashboard
│   └── app/
│       ├── dashboard/
│       │   ├── profile/              Profile editor
│       │   └── resume/               Resume upload + status
│       ├── login/
│       └── register/
│
└── docker-compose.yml                PostgreSQL + Redis for local development
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Create a new account |
| `POST` | `/api/v1/auth/login` | Authenticate and receive tokens |
| `POST` | `/api/v1/auth/refresh` | Exchange refresh token for new access token |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/profile` | Fetch current user profile |
| `PUT` | `/api/v1/profile` | Update profile fields |

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/resolve` | Batch resolve form fields → answers |
| `POST` | `/api/v1/resume/upload` | Upload and parse a resume (PDF / DOCX / TXT) |
| `GET` | `/api/v1/resume/status` | Resume processing status |
| `POST` | `/api/v1/feedback` | Save a user-corrected answer |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Interactive Swagger UI |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | **Required.** OpenAI API key |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `JWT_SECRET_KEY` | — | **Required.** Random secret for signing JWTs |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `CORS_ORIGINS` | `[...]` | Allowed origins — must include your extension ID |
| `OPENAI_LLM_MODEL` | `gpt-4o-mini` | LLM model for field inference |
| `EMBEDDING_DIMENSIONS` | `1536` | Embedding size (must match the embed model) |
| `MAX_RESUME_SIZE_MB` | `10` | Maximum resume upload size |
| `ENABLE_TRACING` | `true` | Enable OpenTelemetry tracing |

---

## Contributing

1. Fork the repository and create a feature branch from `develop`
2. Follow existing code style — no type stubs, no unnecessary abstractions
3. Keep PRs focused — one concern per PR
4. Test the extension manually on LinkedIn before submitting

```bash
git checkout develop
git checkout -b feature/your-feature-name
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
