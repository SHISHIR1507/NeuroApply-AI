"""
NeuroApply AI — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, engine
from app.services.cache import cache_service
from app.services.openai_client import openai_client
from app.core.logging import setup_logging, get_logger, request_id_ctx, user_id_ctx
from app.core.tracing import setup_tracing

# Import route modules
from app.api.routes import auth, profile, resolve, resume, feedback, chat, applications, answers

logger = get_logger("app")


# ------------------------------------------------------------------
# Application lifespan — initialize and teardown shared resources
# ------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup:
      1. Initialize structured logging + OpenTelemetry tracing
      2. Initialize PostgreSQL tables + pgvector extension
      3. Connect Redis cache pool
      4. Initialize OpenAI client
    Shutdown:
      1. Close Redis connections
      2. Dispose DB engine
    """
    # --- Startup ---
    # Observability (first — so all subsequent logs are structured)
    setup_logging(debug=settings.debug)
    logger.info("🚀 Starting NeuroApply AI Backend...")

    if settings.enable_tracing:
        setup_tracing(service_name=settings.otel_service_name)
        logger.info("✅ OpenTelemetry tracing initialized")

    # Database
    await init_db()
    logger.info("✅ PostgreSQL + pgvector initialized")

    # Redis
    await cache_service.connect()
    logger.info("✅ Redis cache connected")

    # OpenAI
    openai_client.connect()
    logger.info("✅ OpenAI client initialized")

    yield

    # --- Shutdown ---
    logger.info("🔻 Shutting down...")
    await cache_service.disconnect()
    await engine.dispose()
    logger.info("✅ Cleanup complete")


# ------------------------------------------------------------------
# FastAPI app
# ------------------------------------------------------------------

app = FastAPI(
    title="NeuroApply AI",
    description=(
        "Intelligent job application assistant backend. "
        "Resolves form fields to answers using structured profile data, "
        "cached answers, and resume-derived RAG fallback."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


# ------------------------------------------------------------------
# Request ID middleware — propagates a unique ID per request
# ------------------------------------------------------------------

@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """
    Injects a unique request_id into every request context.
    This ID propagates into all structured logs and trace spans,
    enabling full request-level correlation across services.
    """
    req_id = request.headers.get("X-Request-ID", str(uuid4())[:8])
    token = request_id_ctx.set(req_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response
    finally:
        request_id_ctx.reset(token)


# ------------------------------------------------------------------
# CORS — allow Chrome extension and dev origins
# ------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Mount API routers
# ------------------------------------------------------------------

API_V1_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_V1_PREFIX)
app.include_router(profile.router, prefix=API_V1_PREFIX)
app.include_router(resolve.router, prefix=API_V1_PREFIX)
app.include_router(resume.router, prefix=API_V1_PREFIX)
app.include_router(feedback.router, prefix=API_V1_PREFIX)
app.include_router(chat.router, prefix=API_V1_PREFIX)
app.include_router(applications.router, prefix=API_V1_PREFIX)
app.include_router(answers.router, prefix=API_V1_PREFIX)


# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------

@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "0.1.0",
    }


@app.get("/", tags=["health"])
async def root():
    """Root redirect with API info."""
    return {
        "service": "NeuroApply AI",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }
