<div align="center">

# NeuroApply AI

**Intelligent job application automation — from profile to submitted form in seconds.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)

[Overview](#overview) · [Architecture](#architecture) · [Quick Start](#quick-start) · [API Reference](#api-reference) · [Contributing](#contributing)

</div>

---

## Overview

NeuroApply AI is a full-stack job application assistant that eliminates the repetitive work of filling out LinkedIn Easy Apply forms. A Chrome extension detects modals, extracts form fields, and resolves answers through a multi-layer intelligence pipeline — pulling from your structured profile, learned answer history, and LLM inference as a last resort.

**What it does:**

- Detects LinkedIn Easy Apply modals automatically via a debounced MutationObserver
- Fills text fields, dropdowns, number inputs, radio buttons, and checkboxes
- Converts salary formats intelligently (e.g. `6 LPA` → `600000`)
- Learns from your manual corrections and reuses them in future applications
- Resolves most fields from cache in under 1ms on repeat visits
- Provides a **"Fill this page"** button in the popup for instant manual triggering
- Guided conversational onboarding with streaming chat to build your profile

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                                      │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Content      │  │ Field        │  │ Autofill Engine          │   │
│  │ Script       │→ │ Extractor    │→ │ (React-compatible)       │   │
│  │ (debounced   │  │ (aria/label/ │  │ native setter + events   │   │
│  │  observer)   │  │  DOM walk)   │  │                          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│         │                                                             │
│  ┌──────▼──────┐   ┌───────────────────────────────────────────┐     │
│  │ Service     │   │ Profile Page (profile.html)                │     │
│  │ Worker      │   │ Full-screen chat UI — guided Q&A +         │     │
│  │ (JWT cache  │   │ streaming free-form chat (SSE)             │     │
│  │  + API)     │   └───────────────────────────────────────────┘     │
└──┴──────┬──────┴───────────────────────────────────────────────────  ┘
          │ HTTP (JWT Bearer)
┌─────────▼─────────────────────────────────────────────────────────── ┐
│  FastAPI Backend                                                       │
│                                                                        │
│  POST /api/v1/resolve    POST /api/v1/chat/stream                      │
│                                                                        │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────────┐     │
│  │  Redis   │→ │ Profile  │→ │   Answer    │→ │ LLM Inference  │     │
│  │  Cache   │  │   DB     │  │   History   │  │ (gpt-4o-mini)  │     │
│  └──────────┘  └──────────┘  └─────────────┘  └────────────────┘     │
│                                                                        │
│  PostgreSQL + pgvector · Redis · OpenAI                               │
└─────────────────────────────────────────────────────────────────────  ┘
```

### Field Resolution Pipeline

Every form field runs through this chain until an answer is found:

| Priority | Source | Latency | Description |
|----------|--------|---------|-------------|
| 1 | **Redis Cache** | < 1ms | Previously resolved answer, keyed by user + field hash |
| 2 | **Structured Profile** | 1–5ms | Direct column lookup — name, email, salary, LinkedIn URL, etc. |
| 3 | **Answer History** | 5–10ms | Fuzzy-matched question from past applications |
| 4 | **Default Rules** | < 1ms | Pattern-matched defaults (notice period, salary ranges) |
| 5 | **LLM Inference** | 200–500ms¹ | Full profile sent to GPT-4o-mini for semantic resolution |
| 6 | **Unknown** | — | Left blank; highlighted for manual entry |

> ¹ First occurrence only. LLM answers are cached in Redis and resolve in < 1ms on repeat.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Chrome Extension | Manifest V3, Vanilla JS |
| Profile Chat UI | Full-page HTML/CSS/JS with SSE streaming |
| Marketing Website | Next.js 16, Tailwind CSS v4, Framer Motion |
| Backend | Python 3.13, FastAPI, async SQLAlchemy |
| Database | PostgreSQL 17 + pgvector extension |
| Cache | Redis (answer cache + profile cache) |
| LLM | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Auth | JWT (access + refresh tokens, bcrypt passwords) |

---

## Quick Start

### 0. Run the marketing website (optional)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

The landing page showcases the product with animated sections, an interactive resolution engine demo, and an "Add to Chrome" CTA. Built with Next.js 16 + Tailwind v4 + Framer Motion.

---

### 1. Start PostgreSQL and Redis

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

### 2. Run the backend

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

### 3. Load the Chrome extension

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

### 4. Set up your profile

1. Click the NeuroApply AI icon in Chrome
2. Register with your email and password
3. Click **Open Profile Setup** — a guided chat UI walks you through your profile (name, title, salary, skills, etc.)
4. Optionally upload your resume in the popup — fields are auto-extracted
5. The more your profile is filled, the fewer LLM calls are needed

---

## Usage

1. Open any LinkedIn job posting and click **Easy Apply**
2. NeuroApply AI detects the modal and fills all resolvable fields automatically
3. A notification shows how many fields were filled
4. Review any field — your correction is saved immediately and reused in future applications
5. Click **Next** to advance — fields are filled automatically on every step

**Manual trigger:** If a page doesn't autofill, open the popup and click **Fill this page**. This bypasses all timing issues and immediately resolves the current modal.

> **After reloading the extension**, always refresh the LinkedIn tab before applying. Old content scripts cannot be replaced without a page reload — the extension will show a banner prompting you to do this.

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
| `POST` | `/api/v1/chat/field` | Guided Q&A — normalize and save a single profile field |
| `POST` | `/api/v1/chat/stream` | SSE streaming free-form chat with profile context |

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

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Fields not filling, no log in console | Extension toggle is off | Open popup, enable the toggle |
| `chrome-extension://invalid/` errors | Extension reloaded without tab refresh | Reload the LinkedIn tab |
| "Fill this page" says "Reload LinkedIn tab first" | Old content script, context invalidated | Reload the LinkedIn tab |
| Backend error: `auth_required` | Token expired or cleared | Sign out and sign in again from the popup |
| Backend error: `network_error` | Backend not running | Run `uvicorn app.main:app --reload --port 8000` |
| Fields show "0 filled" | Profile incomplete | Open Profile Setup and complete your profile |

---

## License

MIT — see [LICENSE](LICENSE) for details.
