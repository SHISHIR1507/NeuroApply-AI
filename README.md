# NeuroApply AI

> Intelligent job application assistant that autofills forms using your structured profile and resume data.

## Architecture

```
Extension (Chrome MV3)  ←→  Backend (FastAPI)  ←→  Storage (PostgreSQL + Redis)
     ↓                          ↓                       ↓
  DOM Observer              Resolver Engine          pgvector (embeddings)
  Field Extractor           Field Mapper             Answer History
  Autofill Engine           NVIDIA NIM Client        User Profiles
```

### Resolution Priority Chain (Hot Path)
1. **Redis Cache** (sub-ms) → exact match
2. **Structured Profile** (1-5ms) → direct column lookup
3. **Answer History** (5-10ms) → previously answered questions
4. **Resume RAG** (50-200ms) → vector similarity search (fallback only)
5. **Unknown** → prompt user, store answer for future reuse

### Key Design Decisions
- **No LLMs on the hot path** — all heavy computation happens offline during resume upload
- **Fuzzy string matching** (rapidfuzz) for field label → canonical key mapping
- **Batch field resolution** — single API call resolves all form fields
- **Learning loop** — user corrections are stored and cached instantly

## Tech Stack

| Component | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, async SQLAlchemy |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| LLM | NVIDIA NIM (meta/llama-3.1-70b-instruct) |
| Embeddings | NVIDIA NIM (nvidia/nv-embedqa-e5-v5) |
| Extension | Chrome Manifest V3 |
| Auth | JWT (email/password) |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- NVIDIA API key from [build.nvidia.com](https://build.nvidia.com)

### 1. Setup environment
```bash
cd backend
cp .env.example .env
# Edit .env and add your NVIDIA_API_KEY
```

### 2. Start services
```bash
# From project root
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432) with pgvector extension
- Redis (port 6379)
- FastAPI backend (port 8000)

### 3. Verify
```bash
curl http://localhost:8000/health
# → {"status": "healthy", "service": "NeuroApply AI", "version": "0.1.0"}
```

### 4. API Docs
Open http://localhost:8000/docs for interactive Swagger UI.

### 5. Load the extension
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` directory
4. Navigate to LinkedIn and try Easy Apply

## Development

### Backend (without Docker)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Start PostgreSQL and Redis separately, then:
uvicorn app.main:app --reload --port 8000
```

### API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Login (get JWT) |
| `GET/PUT` | `/api/v1/profile` | Profile CRUD |
| `POST` | `/api/v1/resolve` | Batch field resolution |
| `POST` | `/api/v1/resume/upload` | Upload resume for parsing |
| `GET` | `/api/v1/resume/status` | Check parsing status |
| `POST` | `/api/v1/feedback` | Submit answer corrections |
| `GET` | `/health` | Health check |

## Project Structure

```
NeuroApply AI/
├── extension/                      # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   └── src/
│       ├── content/               # DOM interaction
│       │   ├── content.js         # MutationObserver + orchestrator
│       │   ├── fieldExtractor.js  # Label-based field extraction
│       │   ├── autofill.js        # React-compat form filling
│       │   └── content.css        # Visual feedback
│       ├── background/
│       │   └── background.js      # Service worker + API client
│       └── popup/
│           ├── popup.html         # Settings UI
│           ├── popup.js           # Auth + profile + resume
│           └── popup.css          # Dark theme styles
│
├── backend/                        # FastAPI Backend
│   ├── app/
│   │   ├── main.py                # Entry point + lifespan
│   │   ├── config.py              # Environment settings
│   │   ├── models.py              # SQLModel tables
│   │   ├── database.py            # Async engine + pgvector
│   │   ├── api/
│   │   │   ├── schemas.py         # Pydantic models
│   │   │   ├── deps.py            # Dependency injection
│   │   │   └── routes/            # API endpoints
│   │   ├── services/
│   │   │   ├── resolver.py        # Field resolution engine
│   │   │   ├── field_mapper.py    # Fuzzy label matching
│   │   │   ├── cache.py           # Redis operations
│   │   │   ├── resume_parser.py   # NVIDIA NIM parsing
│   │   │   ├── vector_store.py    # pgvector operations
│   │   │   └── nvidia_client.py   # NVIDIA NIM API client
│   │   └── core/
│   │       ├── security.py        # JWT + bcrypt
│   │       └── exceptions.py      # HTTP exceptions
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml
└── README.md
```

## License

MIT
