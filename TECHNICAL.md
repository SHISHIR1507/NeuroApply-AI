# NeuroApply AI — Full Technical Documentation

> Last updated: June 2026  
> Repo: https://github.com/SHISHIR1507/NeuroApply-AI

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Database Design](#3-database-design)
4. [Field Resolution Engine](#4-field-resolution-engine)
5. [Field Mapper & Canonical Keys](#5-field-mapper--canonical-keys)
6. [Redis Cache Strategy](#6-redis-cache-strategy)
7. [Resume Processing Pipeline](#7-resume-processing-pipeline)
8. [API Reference](#8-api-reference)
9. [Authentication & Security](#9-authentication--security)
10. [Chrome Extension Architecture](#10-chrome-extension-architecture)
11. [Frontend Dashboard](#11-frontend-dashboard)
12. [Observability & Logging](#12-observability--logging)
13. [Environment Configuration](#13-environment-configuration)
14. [Data Flow Diagrams](#14-data-flow-diagrams)

---

## 1. Product Overview

NeuroApply AI is an AI-powered Chrome extension that automatically fills job application forms — specifically LinkedIn Easy Apply — by resolving each form field to an answer using the user's stored profile, their history of previous answers, and LLM inference when needed.

### Core Idea

When you click "Easy Apply" on LinkedIn, the extension detects the modal, extracts every input field label, sends them to the backend, and receives answers back — all within under 500ms. The user can manually correct any wrong answer, and that correction is stored and reused in future applications.

### Key Features

| Feature | Description |
|---------|-------------|
| Smart autofill | Fills text inputs, number fields, dropdowns, yes/no toggles |
| Learning loop | Corrections saved to DB and cached in Redis, immediately used next time |
| LLM fallback | Custom or unusual questions answered using GPT-4o-mini with the user's full profile as context |
| Salary normalization | "6 LPA" → `600000` automatically |
| Proficiency handling | Any "rate yourself" question answered 8–10 |
| ON/OFF toggle | Single click to enable/disable autofill entirely |
| Token validation | Popup verifies JWT on every open — auto-logout if expired |
| Resume parsing | Upload a PDF/DOCX once; fields are auto-populated and chunks embedded for RAG |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐  │
│  │   Popup UI   │    │     LinkedIn Page (any tab)       │  │
│  │  (popup.js)  │    │                                   │  │
│  │              │    │  ┌────────────────────────────┐   │  │
│  │  - Login     │    │  │   content.js               │   │  │
│  │  - Profile   │    │  │   (MutationObserver)       │   │  │
│  │  - Toggle    │    │  │   - Detect Easy Apply modal│   │  │
│  │  - Resume    │    │  │   - Extract field labels   │   │  │
│  └──────┬───────┘    │  │   - Call background.js     │   │  │
│         │            │  │   - Autofill responses     │   │  │
│         │            │  │   - Save corrections       │   │  │
│         │            │  └────────────┬───────────────┘   │  │
│         │            └───────────────│───────────────────┘  │
│         │                            │                       │
│         └──────────┐  ┌─────────────┘                       │
│                    ▼  ▼                                      │
│           ┌─────────────────┐                               │
│           │  background.js  │  (Service Worker)             │
│           │                 │                               │
│           │  - Auth tokens  │                               │
│           │  - API calls    │                               │
│           │  - Local cache  │                               │
│           └────────┬────────┘                               │
└────────────────────│────────────────────────────────────────┘
                     │  HTTP (JWT Bearer)
                     ▼
┌────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (:8000)                    │
│                                                            │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────────┐  │
│  │  /auth  │  │ /profile │  │/resolve│  │  /resume   │  │
│  └─────────┘  └──────────┘  └───┬────┘  └────────────┘  │
│                                  │                         │
│                         ┌────────▼────────┐               │
│                         │  resolver.py    │               │
│                         │  (5-step chain) │               │
│                         └───────┬─────────┘               │
│                                 │                          │
│          ┌──────────────────────┼──────────────────────┐  │
│          ▼                      ▼                       ▼  │
│    ┌──────────┐         ┌──────────────┐        ┌─────────┐│
│    │  Redis   │         │  PostgreSQL  │        │ OpenAI  ││
│    │  Cache   │         │  + pgvector  │        │ API     ││
│    └──────────┘         └──────────────┘        └─────────┘│
└────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | File | Role |
|-----------|------|------|
| Content Script | `content.js` | Watches DOM for Easy Apply modal, extracts fields, drives autofill |
| Field Extractor | `fieldExtractor.js` | Traverses DOM to find `<label>` + `<input>` pairs |
| Autofill | `autofill.js` | Fills form fields using React-compatible synthetic events |
| Service Worker | `background.js` | Owns auth tokens, makes all API calls, maintains local LRU cache |
| Popup | `popup.js` | Login/logout, profile quickedit, resume upload, ON/OFF toggle |
| FastAPI App | `main.py` | CORS, request ID middleware, lifespan startup |
| Resolver | `resolver.py` | 5-step resolution engine |
| Field Mapper | `field_mapper.py` | Fuzzy label → canonical key mapping |
| Cache Service | `cache.py` | Redis wrapper for answers, profiles, RAG results |
| Resume Parser | `resume_parser.py` | PDF/DOCX → text → GPT parse → pgvector embed |
| Vector Store | `vector_store.py` | pgvector queries for resume RAG |
| OpenAI Client | `openai_client.py` | Async wrapper for chat completions + embeddings |

---

## 3. Database Design

PostgreSQL 17 with the `pgvector` extension. Five tables.

### 3.1 `user_profiles`

Primary table. One row per user. Holds credentials, structured profile fields, and skills/education as JSONB arrays.

```sql
CREATE TABLE user_profiles (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    hashed_password     VARCHAR(255) NOT NULL,
    full_name           VARCHAR(255) NOT NULL,
    phone               VARCHAR(50),

    -- Professional info (source of truth for direct field answers)
    years_of_experience INTEGER,
    current_title       VARCHAR(255),
    current_company     VARCHAR(255),
    current_salary      VARCHAR(100),   -- stored as "4 LPA", converted on resolve
    expected_salary     VARCHAR(100),   -- stored as "6 LPA", converted on resolve
    notice_period       VARCHAR(100),
    location            VARCHAR(255),
    work_authorization  VARCHAR(100),
    willing_to_relocate BOOLEAN,
    requires_sponsorship BOOLEAN,
    linkedin_url        VARCHAR(500),
    github_url          VARCHAR(500),
    portfolio_url       VARCHAR(500),

    -- Arrays stored as JSONB
    skills              JSONB,          -- ["Python", "FastAPI", "React", ...]
    education           JSONB,          -- [{"degree": ..., "university": ..., ...}]
    certifications      JSONB,          -- ["AWS Solutions Architect", ...]
    languages           JSONB,          -- ["English", "Hindi"]

    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now()
);

CREATE INDEX ix_user_profiles_email ON user_profiles(email);
```

**Key design decisions:**
- Salary fields stored as strings (e.g., "6 LPA") rather than integers — users input them in natural format. The resolver converts them at read time via `_clean_profile_value()`.
- JSONB for skills/education allows querying individual elements if needed without a separate normalized table.
- `hashed_password` is bcrypt with cost factor 12 (passlib default).

---

### 3.2 `field_mappings`

Stores label-to-canonical-key mappings per platform. Currently mostly populated from the hardcoded `CANONICAL_FIELDS` dict in `field_mapper.py`. Reserved for future DB-backed custom mappings.

```sql
CREATE TABLE field_mappings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_key   VARCHAR(100) NOT NULL,
    label_pattern   VARCHAR(500) NOT NULL,
    platform        VARCHAR(50)  DEFAULT 'generic',
    field_type      VARCHAR(50)  DEFAULT 'text',  -- text, number, select, boolean

    CONSTRAINT uq_field_mapping UNIQUE (canonical_key, label_pattern, platform)
);

CREATE INDEX ix_field_mappings_canonical_key ON field_mappings(canonical_key);
```

---

### 3.3 `answer_history`

The learning store. Every answer the user types (or corrects) goes here. The resolver reads from this before calling the LLM.

```sql
CREATE TABLE answer_history (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES user_profiles(id),
    question_text   TEXT        NOT NULL,    -- normalized label (lowercased, stripped)
    canonical_key   VARCHAR(100),            -- NULL if no mapping found
    answer_value    TEXT        NOT NULL,
    platform        VARCHAR(50) DEFAULT 'generic',
    confidence      FLOAT       DEFAULT 1.0, -- 1.0 = user-provided, 0.8 = LLM-inferred
    times_used      INTEGER     DEFAULT 1,
    created_at      TIMESTAMP   DEFAULT now(),
    updated_at      TIMESTAMP   DEFAULT now()
);

CREATE INDEX ix_answer_history_user_question ON answer_history(user_id, canonical_key);
CREATE INDEX ix_answer_history_user_id ON answer_history(user_id);
```

**Key design decisions:**
- `question_text` is stored normalized (lowercased, stripped) to maximize exact match hits.
- `canonical_key` allows grouped lookups: if you've answered "Expected CTC" before, "Expected Salary" resolves via the same `expected_salary` canonical key.
- `confidence` differentiates user corrections (1.0) from LLM-generated answers that were passively accepted (0.8). Resolver only trusts history entries with `confidence >= 0.75`.
- `times_used` counter available for future frequency-based ranking.

---

### 3.4 `resume_data`

Stores the full text and parsed structured JSON for each uploaded resume.

```sql
CREATE TABLE resume_data (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES user_profiles(id),
    raw_text    TEXT        NOT NULL,   -- original extracted text
    parsed_json JSONB       NOT NULL,   -- structured fields extracted by GPT-4o-mini
    file_name   VARCHAR(255) NOT NULL,
    file_hash   VARCHAR(64)  NOT NULL,  -- SHA-256 of raw_text, used for deduplication
    status      VARCHAR(20)  DEFAULT 'processing',  -- processing | completed | failed
    parsed_at   TIMESTAMP,
    created_at  TIMESTAMP   DEFAULT now()
);

CREATE INDEX ix_resume_data_user_id ON resume_data(user_id);
CREATE INDEX ix_resume_data_file_hash ON resume_data(file_hash);
```

**The `parsed_json` structure (extracted by GPT-4o-mini):**
```json
{
  "full_name": "Shishir Singh",
  "email": "shishir@example.com",
  "phone": "+91-XXXXX",
  "location": "Hyderabad",
  "current_title": "Software Engineer",
  "current_company": "XYZ Corp",
  "years_of_experience": 1,
  "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
  "education": [{ "degree": "B.Tech", "university": "...", "graduation_year": "2024" }],
  "work_experience": [{ "title": "...", "company": "...", "duration": "...", "description": "..." }],
  "projects": [{ "name": "...", "description": "...", "technologies": ["..."] }],
  "summary": "..."
}
```

---

### 3.5 `resume_embeddings`

Vector chunks for RAG. Each resume is split into overlapping word-chunks, and each chunk gets a 1536-dim OpenAI embedding stored in pgvector.

```sql
CREATE TABLE resume_embeddings (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES user_profiles(id),
    resume_id   UUID        NOT NULL REFERENCES resume_data(id),
    chunk_index INTEGER     DEFAULT 0,
    chunk_text  TEXT        NOT NULL,
    embedding   vector(1536) NOT NULL,  -- OpenAI text-embedding-3-small
    created_at  TIMESTAMP   DEFAULT now()
);

CREATE INDEX ix_resume_embedding_user ON resume_embeddings(user_id);
-- pgvector IVFFlat or HNSW index (optional, for large user bases):
-- CREATE INDEX ON resume_embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Chunking parameters (configurable in settings):**
- Chunk size: 200 words
- Overlap: 50 words
- A typical 1-page resume produces ~8–15 chunks

---

### Entity-Relationship Diagram

```
user_profiles
    │ id (PK)
    │ email (UNIQUE)
    │ hashed_password
    │ full_name
    │ ... (16 profile fields)
    │
    ├──< answer_history
    │       user_id (FK)
    │       question_text
    │       canonical_key
    │       answer_value
    │       confidence
    │
    └──< resume_data
            user_id (FK)
            raw_text
            parsed_json
            file_hash
            │
            └──< resume_embeddings
                    resume_id (FK)
                    user_id (FK)
                    chunk_text
                    embedding vector(1536)
```

---

## 4. Field Resolution Engine

The resolver (`resolver.py`) is the brain of the product. Given a form field label like "Expected CTC", it returns a concrete answer string.

### Resolution Priority Chain

Every field goes through these steps **in order**. The first step that returns a non-null value wins.

```
Field label + user_id
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Step 1 — Redis Cache                                   │
│  Key: answer:{user_id}:{md5(label)[:12]}               │
│  TTL: 24 hours                                          │
│  → HIT: return cached value immediately (<1ms)         │
│  → MISS: continue                                       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Step 2 — Canonical Key Mapping                         │
│  rapidfuzz token_sort_ratio on 200+ known label vars   │
│  → canonical_key = "expected_salary", conf = 0.92     │
│  → If conf < 0.75 or key not in PROFILE_DIRECT_FIELDS │
│    skip Step 3                                         │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Step 3 — Structured Profile Lookup                     │
│  SELECT * FROM user_profiles WHERE id = $user_id       │
│  profile["expected_salary"] → "6 LPA"                 │
│  _clean_profile_value() → "600000"                    │
│  → HIT: cache + return (1–5ms)                        │
│  → MISS: continue                                       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Step 4 — Answer History                                │
│  First: WHERE user_id=X AND canonical_key="exp_salary" │
│  Then:  WHERE user_id=X AND question_text=label        │
│  Filter: confidence >= 0.75                            │
│  → HIT: cache + return (5–10ms)                       │
│  → MISS: continue                                       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Step 5 — LLM Inference (GPT-4o-mini)                  │
│  System: terse form-filler directive                   │
│  User: field label + type + options + full profile     │
│  max_tokens=60, temperature=0                          │
│  → HIT: cache + return (200–500ms, free on repeat)    │
│  → null: continue                                       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Step 6 — Unknown                                       │
│  Return {value: null, source: "unknown"}               │
│  Field left blank for user to fill manually            │
└─────────────────────────────────────────────────────────┘
```

### Batch Resolution

When the extension sends multiple fields at once (e.g., a page with 5 inputs), the resolver does a single Redis `MGET` for all fields first, then resolves only cache misses individually. This keeps batch latency low when most fields are cached.

```python
# Single round-trip: check cache for all 5 fields at once
cached_values = await cache_service.mget([
    f"answer:{user_id}:{hash(label1)}",
    f"answer:{user_id}:{hash(label2)}",
    ...
])
# Then resolve only the misses
```

### Salary Normalization (`_clean_profile_value`)

```python
# Input: "6 LPA" or "6.5 lakh" or "600000"
# Output: "600000" or "650000" or "600000"

def _clean_profile_value(canonical_key, raw_value):
    if canonical_key in ("expected_salary", "current_salary"):
        m = re.search(r'(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l\b)', value, re.IGNORECASE)
        if m:
            return str(int(float(m.group(1)) * 100000))
        m = re.search(r'(\d+(?:\.\d+)?)', value)
        if m:
            return m.group(1)
    return value
```

### Default Rules (applied before LLM)

Before hitting the LLM for expensive inference, keyword patterns apply fast rules:

| Keyword pattern | Rule |
|----------------|------|
| "years of experience", "yoe", "how many years" | Return `profile.years_of_experience` or `"3"` |
| "proficiency", "rate your", "rate yourself", "skill level" | Return random int 8–10 |
| "score in", "grade 10", "10th", "marks in" | Return `"1"` (placeholder) |

### LLM System Prompt

```
You fill job application form fields. Reply with ONLY the answer — no explanation, no units.
- Skill/proficiency rating (any scale): reply 8
- Yes/No: answer based on profile
- Dropdown: pick the best matching option exactly as written
- Number field: plain digits only, no commas or text
- If truly no relevant info exists: reply null
```

The user prompt passes the field label, type, available options (for dropdowns), and the user's full profile as JSON.

### Resolution Source Labels

| Source | What it means |
|--------|--------------|
| `cache` | Answered from Redis, < 1ms |
| `profile` | Direct column in `user_profiles` |
| `history` | Matched in `answer_history` |
| `llm_infer` | GPT-4o-mini generated the answer |
| `unknown` | Could not resolve; left blank |

---

## 5. Field Mapper & Canonical Keys

`field_mapper.py` maps raw form labels to canonical keys using fuzzy string matching (no LLM on this path).

### How It Works

1. Normalize the input: strip trailing punctuation and lowercase
2. Check for exact match in the flat lookup dict
3. If no exact match: run `rapidfuzz.process.extractOne` with `token_sort_ratio` scorer against 200+ known label variations
4. If score ≥ 80: return `(canonical_key, score/100)`, else return `(None, 0.0)`

```python
normalized = re.sub(r'[\s*?:]+$', '', label.lower().strip())

# Fast path: exact match
if normalized in _LABEL_TO_KEY:
    return _LABEL_TO_KEY[normalized], 1.0

# Fuzzy path: best match in 200+ variations
result = process.extractOne(normalized, _ALL_LABELS, scorer=fuzz.token_sort_ratio, score_cutoff=80)
```

### All Canonical Keys

| Canonical Key | Example Labels |
|--------------|---------------|
| `full_name` | "Full Name", "Legal Name", "Your Name" |
| `email` | "Email", "Email Address", "Email ID" |
| `phone` | "Phone Number", "Mobile Number", "Contact Number" |
| `location` | "Location", "Current City", "City and State" |
| `years_of_experience` | "Years of Experience", "YOE", "Total Experience" |
| `current_title` | "Current Title", "Job Title", "Current Role", "Designation" |
| `current_company` | "Current Company", "Current Employer", "Organization" |
| `current_salary` | "Current CTC", "Current Salary", "Current Package", "Present CTC" |
| `expected_salary` | "Expected Salary", "Expected CTC", "Desired Compensation", "Expected Package" |
| `notice_period` | "Notice Period", "When Can You Start", "Earliest Join Date" |
| `work_authorization` | "Work Authorization", "Are You Authorized to Work" |
| `requires_sponsorship` | "Require Sponsorship", "Need Visa Sponsorship" |
| `willing_to_relocate` | "Willing to Relocate", "Open to Relocation" |
| `linkedin_url` | "LinkedIn", "LinkedIn URL", "LinkedIn Profile" |
| `github_url` | "GitHub", "GitHub URL", "GitHub Profile" |
| `portfolio_url` | "Portfolio", "Website", "Personal Site" |
| `degree` | "Degree", "Highest Level of Education", "Qualification" |
| `university` | "University", "College", "Institution" |
| `graduation_year` | "Graduation Year", "Year of Graduation" |
| `gpa` | "GPA", "CGPA", "Grade Point Average" |
| `skills` | "Skills", "Technical Skills", "Core Competencies" |
| `programming_languages` | "Programming Languages", "Tech Stack" |
| `gender` | "Gender", "Gender Identity" |
| `ethnicity` | "Ethnicity", "Race", "Racial Background" |
| `veteran_status` | "Veteran Status", "Military Service" |
| `disability_status` | "Disability", "Do You Have a Disability" |
| `cover_letter` | "Cover Letter", "Why Do You Want to Work Here" |
| `referral` | "How Did You Hear About Us", "Referral" |

### Field Hash

Used as the Redis key component:
```python
def generate_field_hash(label: str) -> str:
    normalized = label.lower().strip()
    return hashlib.md5(normalized.encode()).hexdigest()[:12]
```

"Expected CTC" and "Expected Salary" produce different hashes, but both map to the same `expected_salary` canonical key, so history lookups find answers across label variations.

---

## 6. Redis Cache Strategy

Three cache namespaces, all per-user:

### 6.1 Answer Cache

```
Key:    answer:{user_id}:{field_hash}
Value:  "600000"
TTL:    24 hours (86400s)
Set by: resolver after every successful resolution
```

Used for instant repeat lookups. If the user applied for 10 jobs with the same "Expected Salary" field, only the first call hits the DB or LLM.

### 6.2 Profile Cache

```
Key:    profile:{user_id}
Value:  JSON of entire UserProfile row (minus hashed_password)
TTL:    1 hour (3600s)
Set by: _get_profile() on first DB read
Invalidated by: profile update endpoint
```

### 6.3 RAG Result Cache

```
Key:    rag:{user_id}:{question_hash}
Value:  LLM-generated answer
TTL:    configurable (default: same as answer cache)
Set by: resolver after LLM inference
```

Even though LLM inference is Step 5, once a question is answered, it's cached in the answer namespace immediately — so any future hit for the same label returns from Redis in < 1ms regardless of how it was originally resolved.

### Cache Key Collision Safety

- `user_id` is always in the key, so answers never cross users
- `field_hash` is MD5 of the normalized label (12 hex chars = 48 bits), collision probability negligible for expected scale

---

## 7. Resume Processing Pipeline

Triggered when a user uploads a resume via the extension popup or the Next.js dashboard.

```
File Upload (PDF / DOCX / TXT)
        │
        ▼
1. Text Extraction
   ├── PDF: pdfminer.six
   ├── DOCX: python-docx
   └── TXT: raw decode
        │
        ▼
2. Duplicate Check
   SHA-256 hash of raw_text
   → SELECT FROM resume_data WHERE file_hash = $hash
   → If exists: return {status: "duplicate"}
        │
        ▼
3. Create DB record (status: "processing")
        │
        ▼
4. Structured Extraction (GPT-4o-mini, temp=0.05)
   Input: raw_text[:8000 chars]
   Output: JSON with name, email, title, company, skills,
           education, work_experience, projects, summary
        │
        ▼
5. Profile Backfill (only fills NULL columns, never overwrites)
   resume.full_name → user_profiles.full_name (if null)
   resume.skills    → user_profiles.skills     (if null)
   ... (13 mapped fields)
        │
        ▼
6. Text Chunking
   Word-boundary split, 200 words, 50-word overlap
   Typical: 8–15 chunks per resume
        │
        ▼
7. Batch Embedding (OpenAI text-embedding-3-small, 1536 dims)
   Single API call for all chunks
        │
        ▼
8. Store in resume_embeddings
   pgvector column: vector(1536)
        │
        ▼
9. Update resume_data.status → "completed"
```

### Profile Backfill Mapping

```python
RESUME_TO_PROFILE_MAPPING = {
    "full_name":          "full_name",
    "phone":              "phone",
    "location":           "location",
    "current_title":      "current_title",
    "current_company":    "current_company",
    "years_of_experience":"years_of_experience",
    "linkedin_url":       "linkedin_url",
    "github_url":         "github_url",
    "portfolio_url":      "portfolio_url",
    "skills":             "skills",
    "education":          "education",
    "certifications":     "certifications",
    "languages":          "languages",
}
```

---

## 8. API Reference

Base URL: `http://localhost:8000/api/v1`  
All protected endpoints require: `Authorization: Bearer <access_token>`

### Auth

#### `POST /auth/register`
Create a new account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "mypassword",
  "full_name": "Shishir Singh"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

#### `POST /auth/login`
Authenticate.

**Request:**
```json
{ "email": "user@example.com", "password": "mypassword" }
```

**Response (200):** Same as register.

---

#### `POST /auth/refresh`
Exchange a refresh token for new tokens.

**Request:**
```json
{ "refresh_token": "eyJ..." }
```

---

### Profile

#### `GET /profile`
Get the current user's profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Shishir Singh",
  "phone": "+91-XXXXX",
  "years_of_experience": 1,
  "current_title": "Software Engineer",
  "current_company": "XYZ",
  "current_salary": "4 LPA",
  "expected_salary": "6 LPA",
  "notice_period": "1 month",
  "location": "Hyderabad",
  "skills": ["Python", "FastAPI"],
  "education": [...],
  "willing_to_relocate": true,
  "requires_sponsorship": false
}
```

---

#### `PUT /profile`
Update profile fields. Only provided fields are updated (partial update).

**Request:**
```json
{
  "expected_salary": "7 LPA",
  "notice_period": "2 weeks"
}
```

---

### Resolve

#### `POST /resolve`
The hot path. Batch-resolve form field labels to answers.

**Request:**
```json
{
  "fields": [
    {
      "id": "field-1",
      "label": "Expected CTC",
      "type": "text",
      "required": true,
      "options": [],
      "current_value": ""
    },
    {
      "id": "field-2",
      "label": "Rate yourself in Python",
      "type": "number",
      "required": false,
      "options": [],
      "current_value": ""
    }
  ],
  "platform": "linkedin",
  "job_url": "https://linkedin.com/jobs/..."
}
```

**Response:**
```json
{
  "fields": [
    {
      "field_id": "field-1",
      "label": "Expected CTC",
      "value": "600000",
      "source": "profile",
      "confidence": 0.92,
      "canonical_key": "expected_salary"
    },
    {
      "field_id": "field-2",
      "label": "Rate yourself in Python",
      "value": "9",
      "source": "llm_infer",
      "confidence": 0.8,
      "canonical_key": null
    }
  ],
  "resolved_count": 2,
  "total_count": 2,
  "latency_ms": 312.4
}
```

---

### Resume

#### `POST /resume/upload`
Upload and process a resume file.

**Request:** `multipart/form-data` with field `file` (PDF, DOCX, or TXT)

**Response:**
```json
{
  "status": "completed",
  "resume_id": "uuid",
  "fields_extracted": 14,
  "chunks_embedded": 11
}
```

Or `{"status": "duplicate", "message": "..."}` if same file uploaded again.

---

#### `GET /resume/status`
Check resume processing status.

**Response:**
```json
{
  "has_resume": true,
  "status": "completed",
  "file_name": "shishir_resume.pdf",
  "chunks_embedded": 11,
  "parsed_at": "2026-06-10T12:00:00"
}
```

---

### Feedback

#### `POST /feedback`
Save a user correction. Called automatically when the user manually changes an autofilled field.

**Request:**
```json
{
  "field_label": "Expected Salary",
  "corrected_value": "700000",
  "platform": "linkedin",
  "canonical_key": null
}
```

**Response:**
```json
{
  "status": "saved",
  "message": "Answer stored for 'Expected Salary' (mapped to: expected_salary)"
}
```

**What happens internally:**
1. Maps label to canonical key
2. Upserts `answer_history` row (creates or updates)
3. Sets confidence = 1.0 (user-corrected, highest trust)
4. Immediately updates Redis cache so next form uses this value

---

### Health

#### `GET /health`
```json
{ "status": "healthy", "service": "NeuroApply AI", "version": "0.1.0" }
```

---

## 9. Authentication & Security

### JWT Tokens

| Token | TTL | Purpose |
|-------|-----|---------|
| Access token | 60 minutes | API authentication |
| Refresh token | 7 days | Get a new access token |

Both tokens are JWTs signed with HS256 using `JWT_SECRET_KEY` from environment.

**Token payload:**
```json
{
  "sub": "user-uuid",
  "exp": 1234567890,
  "type": "access"
}
```

### Password Hashing

bcrypt via passlib with default cost factor 12. Password is never stored or logged in plaintext.

### Extension Token Storage

- `chrome.storage.local` stores `authToken` and `refreshToken`
- Popup validates the access token on every open by calling `GET /profile` — if 401, auto-logout

### CORS

Configured to allow:
- `chrome-extension://YOUR_EXTENSION_ID`
- `http://localhost:3000` (Next.js dev)

The extension's `manifest.json` must include `http://localhost:8000/*` in `host_permissions` for Chrome to allow the fetch.

---

## 10. Chrome Extension Architecture

Manifest V3. Three components: content script, service worker, popup.

### 10.1 Content Script (`content.js`)

Injected into every `*://*.linkedin.com/*` page.

**MutationObserver loop:**
```
DOM mutation detected
    │
    ▼
isEnabled()? → chrome.storage.local.get("neuroapplyEnabled")
    │ NO: return
    │ YES: continue
    ▼
findEasyApplyModal()
    │ Walk input elements up 12 DOM levels
    │ Look for visible container (w>300, h>200)
    │ Text must contain "Apply" or "application" or "resume"
    │ NULL: reset lastProcessedFields
    ▼
setTimeout 500ms → processModal(modal)
    │
    ▼
processModal(modal):
    1. modal.dataset.neuroapplyModal = 'true'   (mark for correction scoping)
    2. FieldExtractor.extractFields(modal)      (get {id, label, type, options})
    3. Build fieldSignature = labels.join('|')
    4. Skip if fieldSignature === lastProcessedFields
    5. sendMessage('RESOLVE_FIELDS', {fields, platform, jobUrl})
    6. On response: Autofill.fillAll(modal, enrichedFields)
    7. showNotification(filled, unresolved)
    8. if resolved_count > 0: lastProcessedFields = fieldSignature
```

**Correction listener (learning loop):**
```javascript
input.addEventListener('change', () => {
    if (!input.closest('[data-neuroapply-modal]')) return; // Only Easy Apply modal
    const label = FieldExtractor.findLabel(input);
    chrome.runtime.sendMessage({
        type: 'SUBMIT_FEEDBACK',
        payload: { field_label: label, corrected_value: value, platform: 'linkedin' }
    });
});
```

The `[data-neuroapply-modal]` guard prevents saving answers when the user interacts with other LinkedIn UI (ads, notification buttons, etc.).

### 10.2 Service Worker (`background.js`)

Handles all API calls. Content scripts cannot make cross-origin fetches directly — they message the service worker, which has the token and makes the fetch.

**Message types handled:**

| Type | Action |
|------|--------|
| `GET_AUTH_STATUS` | Returns `{ authenticated: !!token }` |
| `LOGIN` | POST to `/auth/login`, stores tokens, returns status |
| `LOGOUT` | Clears tokens from storage |
| `RESOLVE_FIELDS` | POST to `/resolve` with Bearer token, returns resolved fields |
| `SUBMIT_FEEDBACK` | POST to `/feedback` with Bearer token |

### 10.3 Popup (`popup.js`)

**On open:**
1. Load `neuroapplyEnabled` from storage → set toggle state
2. Check `GET_AUTH_STATUS` → if authenticated, validate token with a real `GET /profile` call
3. If 401: force logout, show login form
4. If 200: show main view, populate profile fields from API response

**Toggle:**
- Saves `neuroapplyEnabled: true/false` to `chrome.storage.local`
- Default behavior: `neuroapplyEnabled !== false` → ON unless explicitly turned off

**Profile fields mapped in popup:**

| Popup Input ID | Profile Key |
|---------------|------------|
| `profileYoe` | `years_of_experience` |
| `profileTitle` | `current_title` |
| `profileCurrentSalary` | `current_salary` |
| `profileSalary` | `expected_salary` |
| `profileNotice` | `notice_period` |
| `profileLocation` | `location` |

---

## 11. Frontend Dashboard

Next.js 14 app at `frontend/`. Uses TypeScript + Tailwind CSS.

**Routes:**
- `/login` — Email/password login
- `/register` — Create account
- `/dashboard` — Profile editor, resume upload, stats
- `/dashboard/resume` — Dedicated resume management page

The frontend hits the same FastAPI backend at `localhost:8000`. In production, both would share a domain or the frontend would proxy API calls.

---

## 12. Observability & Logging

### Structured JSON Logging

Every log entry is a JSON object, not a plain string. This enables log aggregation tools (Datadog, Loki, CloudWatch) to parse and query fields.

```json
{
  "timestamp": "2026-06-10T12:00:00Z",
  "level": "INFO",
  "logger": "resolver",
  "request_id": "a1b2c3d4",
  "user_id": "uuid",
  "message": "Batch resolution complete: 4/5 fields resolved in 312.4ms",
  "phase": "batch_complete",
  "latency_ms": 312.4,
  "resolved_count": 4,
  "total_count": 5,
  "source_profile": 2,
  "source_cache": 1,
  "source_llm_infer": 1,
  "source_unknown": 1
}
```

### Per-Field Logging (`[RESOLVE]` prefix)

Each field resolution logs every step:
```
[RESOLVE] START 'Expected CTC' (type=text)
[RESOLVE] STEP1 cache miss 'Expected CTC'
[RESOLVE] STEP2 canonical='expected_salary' confidence=0.92 for 'Expected CTC'
[RESOLVE] STEP3 profile lookup for canonical='expected_salary'
[RESOLVE] STEP3 profile value for 'expected_salary' = '6 LPA'
[RESOLVE] STEP3 RESOLVED 'Expected CTC' → '600000' (profile)
```

### OpenTelemetry Tracing

Optional. When `ENABLE_TRACING=true`, every resolution step gets an OTel span:
- `batch_cache_check`
- `profile_cache_check` / `profile_db_lookup`
- `history_lookup`
- `llm_inference`

Spans are exported to a configurable OTLP endpoint (Jaeger, Tempo, etc.).

### Request ID Propagation

Every HTTP request gets a unique 8-char ID (from `X-Request-ID` header or generated). The ID flows through context vars into all logs for that request, enabling full request-level trace in logs.

---

## 13. Environment Configuration

`backend/.env` (see `.env.example`):

```env
# App
APP_NAME=NeuroApply AI
DEBUG=false
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/neuroapply

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# JWT
JWT_SECRET_KEY=your-long-random-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS (JSON array)
CORS_ORIGINS=["chrome-extension://YOUR_EXT_ID","http://localhost:3000"]

# Resume processing
RESUME_CHUNK_SIZE=200
RESUME_CHUNK_OVERLAP=50

# Cache TTLs (seconds)
ANSWER_CACHE_TTL=86400
PROFILE_CACHE_TTL=3600
RAG_CACHE_TTL=86400

# Tracing (optional)
ENABLE_TRACING=false
OTEL_SERVICE_NAME=neuroapply-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

---

## 14. Data Flow Diagrams

### Full Easy Apply Flow

```
User clicks "Easy Apply" on LinkedIn
            │
            ▼
content.js MutationObserver fires
            │
            ▼
findEasyApplyModal() → detects floating panel with form inputs
            │
     500ms debounce
            │
            ▼
FieldExtractor.extractFields(modal)
  Walks <label> → <input> associations
  Returns [{id, label, type, required, options}]
  e.g. [{label: "First Name"}, {label: "Expected CTC"}, ...]
            │
            ▼
chrome.runtime.sendMessage → background.js
  type: "RESOLVE_FIELDS"
  payload: {fields: [...], platform: "linkedin"}
            │
            ▼
background.js → POST /api/v1/resolve
  Authorization: Bearer eyJ...
            │
            ▼
FastAPI resolver.py
  ┌─────────────────────────────────┐
  │  Batch Redis MGET               │ ← single round-trip for all fields
  │  Miss → resolve_single_field()  │
  │  Step 1–5 per field             │
  └─────────────────────────────────┘
            │
            ▼
Response: {fields: [{field_id, value, source}], resolved_count: 4}
            │
            ▼
background.js → content.js (via sendMessage response)
            │
            ▼
Autofill.fillAll(modal, enrichedFields)
  For each field:
    - text/number: dispatchEvent(new InputEvent) + React setState workaround
    - select: set value + dispatch "change"
    - checkbox/radio: click()
            │
            ▼
showNotification("NeuroApply: 4 fields filled · 1 needs review")
            │
            ▼
User manually changes "Expected Salary" from 600000 → 700000
            │
            ▼
input "change" event fires
  → check input.closest('[data-neuroapply-modal]') → TRUE
  → sendMessage("SUBMIT_FEEDBACK", {field_label, corrected_value})
            │
            ▼
POST /api/v1/feedback
  Upsert answer_history
  Update Redis cache immediately
  Next application: answer served from Redis in <1ms
```

### Resume Upload Flow

```
User uploads resume.pdf via popup
            │
            ▼
POST /api/v1/resume/upload (multipart/form-data)
            │
            ▼
resume_parser.process_resume()
  1. pdfminer.six → raw_text (string)
  2. SHA-256 hash → check duplicate
  3. INSERT resume_data (status: processing)
  4. POST to OpenAI gpt-4o-mini with structured extraction prompt
     → parsed_json {name, skills, education, ...}
  5. Backfill user_profiles (only null fields)
  6. chunk_text() → 8–15 word chunks
  7. POST to OpenAI text-embedding-3-small → 1536-dim vectors
  8. INSERT into resume_embeddings (chunk_text, vector)
  9. UPDATE resume_data.status = "completed"
            │
            ▼
Response: {status: "completed", fields_extracted: 14, chunks_embedded: 11}
            │
            ▼
popup.js shows "✓ resume.pdf · 14 fields extracted · 11 chunks embedded"
popup.js calls loadProfile() → fields in popup now show backfilled data
```

### Token Refresh Flow

```
User opens extension popup
            │
            ▼
Load neuroapplyEnabled from storage → set toggle state
            │
            ▼
GET_AUTH_STATUS → check if authToken exists in storage
  NULL → show login form
  EXISTS → GET /api/v1/profile (real validation call)
              │
     401 Unauthorized
              │
              ▼
         LOGOUT → clear storage → show login form
              │
     200 OK
              ▼
         showMainView()
         populateProfile(data)
         updateStatus("connected")
```

---

*This document reflects the codebase as of June 2026. All table schemas are derived from `backend/app/models.py`. All service behavior is derived from the source files in `backend/app/services/`.*
