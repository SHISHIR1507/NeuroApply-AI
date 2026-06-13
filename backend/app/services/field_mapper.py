"""
NeuroApply AI — Field Mapper
Maps form field labels to canonical keys using fuzzy string matching.
No LLMs on the hot path — just fast, deterministic string matching.
"""

import hashlib
from typing import Optional, Tuple

from rapidfuzz import fuzz, process


# ==================================================================
# Canonical field definitions — 200+ label variations
# ==================================================================
CANONICAL_FIELDS: dict[str, list[str]] = {
    # --- Personal Info ---
    "full_name": [
        "full name", "name", "your name", "candidate name",
        "first name and last name", "legal name",
    ],
    "email": [
        "email", "email address", "e-mail", "your email",
        "contact email", "email id",
    ],
    "phone": [
        "phone", "phone number", "mobile number", "contact number",
        "telephone", "cell phone", "mobile phone", "tel",
    ],
    "location": [
        "location", "city", "current location", "where are you located",
        "current city", "city and state", "address", "where do you live",
    ],

    # --- Professional ---
    "years_of_experience": [
        "years of experience", "total experience", "how many years of experience",
        "professional experience", "work experience years", "yoe",
        "total years of experience", "experience in years",
        "how many years of relevant experience do you have",
        "years of relevant experience",
    ],
    "current_title": [
        "current title", "job title", "current role", "current position",
        "your title", "current job title", "designation", "role",
    ],
    "current_company": [
        "current company", "current employer", "company name",
        "your company", "current organization", "employer",
    ],

    # --- Compensation ---
    "current_salary": [
        "current ctc", "current salary", "current compensation",
        "current package", "current annual salary", "present ctc",
        "current annual package", "current remuneration", "current cost to company",
        "what is your current ctc", "what is your current salary",
        "current fixed salary", "existing salary", "last drawn salary",
    ],
    "expected_salary": [
        "expected salary", "salary expectation", "desired salary",
        "compensation expectation", "desired compensation", "salary range",
        "expected annual salary", "salary requirement", "expected ctc",
        "expected compensation", "what is your expected salary",
        "desired annual salary", "base salary expectation",
        "what is your expected ctc", "expected package",
        "expected annual package", "expected cost to company",
    ],

    # --- Availability ---
    "notice_period": [
        "notice period", "when can you start", "start date",
        "availability", "earliest start date", "how soon can you join",
        "available to start", "when are you available",
        "how soon can you start", "earliest join date",
    ],

    # --- Work Authorization ---
    "work_authorization": [
        "work authorization", "are you authorized to work",
        "work permit", "visa status", "authorization to work",
        "are you legally authorized to work",
        "do you have the right to work",
        "employment authorization",
    ],
    "requires_sponsorship": [
        "require sponsorship", "need sponsorship", "visa sponsorship",
        "will you now or in the future require sponsorship",
        "do you require visa sponsorship",
        "sponsorship required", "need visa sponsorship",
        "require work visa sponsorship",
    ],
    "willing_to_relocate": [
        "willing to relocate", "open to relocation", "relocation",
        "would you relocate", "can you relocate", "able to relocate",
        "are you willing to relocate", "open to relocating",
    ],

    # --- URLs ---
    "linkedin_url": [
        "linkedin", "linkedin url", "linkedin profile",
        "linkedin profile url", "your linkedin",
    ],
    "github_url": [
        "github", "github url", "github profile",
        "github profile url", "your github",
    ],
    "portfolio_url": [
        "portfolio", "portfolio url", "website", "personal website",
        "portfolio link", "your website", "personal site",
    ],

    # --- Education ---
    "degree": [
        "degree", "highest degree", "education level",
        "highest level of education", "qualification",
        "educational qualification", "academic degree",
    ],
    "university": [
        "university", "school", "college", "institution",
        "alma mater", "university name", "college name",
    ],
    "graduation_year": [
        "graduation year", "year of graduation", "when did you graduate",
        "graduation date", "expected graduation",
    ],
    "gpa": [
        "gpa", "grade point average", "cgpa", "cumulative gpa",
    ],

    # --- Skills ---
    "skills": [
        "skills", "technical skills", "key skills", "relevant skills",
        "core competencies", "skill set", "technologies",
    ],
    "programming_languages": [
        "programming languages", "languages", "coding languages",
        "which programming languages", "tech stack",
    ],

    # --- Diversity ---
    "gender": [
        "gender", "gender identity", "what is your gender",
    ],
    "ethnicity": [
        "ethnicity", "race", "race/ethnicity",
        "ethnic background", "racial background",
    ],
    "veteran_status": [
        "veteran status", "are you a veteran", "military service",
        "protected veteran", "veteran",
    ],
    "disability_status": [
        "disability", "disability status", "do you have a disability",
        "disabled", "person with disability",
    ],

    # --- Cover Letter ---
    "cover_letter": [
        "cover letter", "why do you want to work here",
        "why are you interested", "tell us about yourself",
        "why this role", "motivation", "statement of interest",
    ],

    # --- Referral ---
    "referral": [
        "referral", "how did you hear about this position",
        "how did you hear about us", "referred by",
        "source", "where did you find this job",
    ],
}

# Pre-compute: flatten all labels for fast lookup
_ALL_LABELS: list[str] = []
_LABEL_TO_KEY: dict[str, str] = {}
for _key, _labels in CANONICAL_FIELDS.items():
    for _label in _labels:
        _ALL_LABELS.append(_label.lower())
        _LABEL_TO_KEY[_label.lower()] = _key


# ==================================================================
# Public API
# ==================================================================

def map_to_canonical(label: str, threshold: int = 80) -> Tuple[Optional[str], float]:
    """
    Map a raw form field label to a canonical key using fuzzy matching.
    
    Args:
        label: The raw label text from the form field
        threshold: Minimum fuzzy match score (0-100) to consider a match
        
    Returns:
        Tuple of (canonical_key, confidence_score).
        Returns (None, 0.0) if no match found above threshold.
    """
    import re
    normalized = re.sub(r'[\s*?:]+$', '', label.lower().strip())

    # Fast path: exact match
    if normalized in _LABEL_TO_KEY:
        return _LABEL_TO_KEY[normalized], 1.0

    # Fuzzy match against all known labels
    result = process.extractOne(
        normalized,
        _ALL_LABELS,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=threshold,
    )

    if result:
        matched_label, score, _ = result
        canonical_key = _LABEL_TO_KEY[matched_label]
        confidence = score / 100.0
        return canonical_key, confidence

    return None, 0.0


def generate_field_hash(label: str) -> str:
    """
    Generate a stable hash for a field label.
    Used as Redis cache key component.
    """
    normalized = label.lower().strip()
    return hashlib.md5(normalized.encode()).hexdigest()[:12]


def get_all_canonical_keys() -> list[str]:
    """Return all available canonical field keys."""
    return list(CANONICAL_FIELDS.keys())
