# NeuroApply AI

> AI-powered Chrome extension that automatically fills LinkedIn Easy Apply forms using your profile, resume, and learned answers.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?logo=openai&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17+pgvector-4169E1?logo=postgresql&logoColor=white)

---

## How It Works

1. You open a LinkedIn Easy Apply form
2. The extension detects the modal and extracts all form fields
3. Fields are sent to the FastAPI backend for resolution
4. Answers are filled in automatically — name, email, salary, experience, proficiency, yes/no questions, dropdowns
5. Your manual corrections are saved and used in future applications

---

## Resolution Chain

Every field goes through these steps until an answer is found:

| Step | Source | Latency |
|------|--------|---------|
| 1 | **Redis cache** — previously resolved answer | < 1ms |
| 2 | **Structured profile** — direct DB column (name, email, salary, etc.) | 1–5ms |
| 3 | **Answer history** — questions you've answered before | 5–10ms |
| 4 | **LLM inference** — GPT-4o-mini reads your full profile and answers any question semantically | 200–500ms (cached after first hit) |
| 5 | **Unknown** — left blank for manual input |  |

Salary values are auto-converted from "6 LPA" → `600000`. Proficiency/rating questions default to 8–10. All LLM answers are cached in Redis so repeat questions are instant.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python 3.13, FastAPI, async SQLAlchemy |
| Database | PostgreSQL 17 + pgvector |
| Cache | Redis |
| LLM | OpenAI gpt-4o-mini |
| Embeddings | OpenAI text-embedding-3-small (1536-dim) |
| Extension | Chrome Manifest V3 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Auth | JWT (email/password) |

---

## Local Setup (No Docker)

### Prerequisites
- Python 3.11+
- PostgreSQL 17 with pgvector
- Redis
- Node.js 18+
- OpenAI API key

### 1. Clone and configure

```bash
git clone https://github.com/SHISHIR1507/NeuroApply-AI.git
cd NeuroApply-AI/backend
cp .env.example .env
# Edit .env — set OPENAI_API_KEY and DATABASE_URL
```

### 2. Start PostgreSQL and Redis

```bash
# macOS (Homebrew)
brew services start postgresql@17
brew services start redis

# Create DB
psql postgres -c "CREATE USER neuroapply WITH PASSWORD 'neuroapply_dev';"
psql postgres -c "CREATE DATABASE neuroapply OWNER neuroapply;"
psql neuroapply -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Run the backend

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Run the frontend (optional)

```bash
cd ../frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### 5. Load the Chrome extension

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Pin the extension and log in via the popup

### 6. Verify

```bash
curl http://localhost:8000/health
# → {"status": "healthy", "service": "NeuroApply AI", "version": "0.1.0"}
```

---

## Chrome Extension Usage

- Click the **NeuroApply AI** icon in Chrome to open the popup
- **Toggle** (top-right of popup) — flip ON before applying, OFF when browsing normally
- Log in with the same credentials you registered on the frontend/backend
- Upload your resume in the popup or at `localhost:3000/dashboard/resume`
- Open any LinkedIn job → click **Easy Apply** → fields fill automatically
- Manually correct any field — your answer is saved and reused next time

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Login (returns JWT) |
| `GET` | `/api/v1/profile` | Get profile |
| `PUT` | `/api/v1/profile` | Update profile |
| `POST` | `/api/v1/resolve` | Batch resolve form fields |
| `POST` | `/api/v1/resume/upload` | Upload + parse resume |
| `GET` | `/api/v1/resume/status` | Resume processing status |
| `POST` | `/api/v1/feedback` | Save a corrected answer |
| `GET` | `/health` | Health check |

---

## Project Structure

```
NeuroApply-AI/
├── extension/                    # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   └── src/
│       ├── content/
│       │   ├── content.js        # MutationObserver, modal detection, orchestrator
│       │   ├── fieldExtractor.js # Label extraction from DOM
│       │   ├── autofill.js       # React-compatible form filling
│       │   └── content.css
│       ├── background/
│       │   └── background.js     # Service worker, API client, local cache
│       └── popup/
│           ├── popup.html        # Quick profile, resume upload, toggle
│           ├── popup.js
│           └── popup.css
│
├── backend/                      # FastAPI Backend
│   ├── app/
│   │   ├── main.py               # App entry point + lifespan
│   │   ├── config.py             # Environment settings
│   │   ├── models.py             # SQLModel DB tables
│   │   ├── api/
│   │   │   ├── schemas.py        # Pydantic request/response models
│   │   │   ├── deps.py           # Auth dependency injection
│   │   │   └── routes/           # auth, profile, resolve, resume, feedback
│   │   ├── services/
│   │   │   ├── resolver.py       # 5-step field resolution engine
│   │   │   ├── field_mapper.py   # Fuzzy label → canonical key mapping
│   │   │   ├── openai_client.py  # OpenAI async wrapper
│   │   │   ├── cache.py          # Redis operations
│   │   │   ├── resume_parser.py  # Resume text extraction + OpenAI parsing
│   │   │   └── vector_store.py   # pgvector similarity search
│   │   └── core/
│   │       ├── security.py       # JWT + bcrypt
│   │       ├── logging.py        # Structured JSON logging
│   │       └── tracing.py        # OpenTelemetry spans
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/                     # Next.js 14 Dashboard
│   └── app/
│       ├── dashboard/            # Profile editor, resume upload
│       ├── login/
│       └── register/
│
└── docker-compose.yml            # PostgreSQL + Redis (optional)
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://neuroapply:neuroapply_dev@localhost:5432/neuroapply
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=["chrome-extension://YOUR_EXTENSION_ID","http://localhost:3000"]
```

---

## License

MIT
