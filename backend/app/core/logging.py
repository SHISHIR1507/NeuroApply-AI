"""
NeuroApply AI — Structured Logging
JSON-formatted logging with request context propagation.

Every log line is machine-parseable JSON containing:
  - timestamp, level, logger name, message
  - request_id (propagated via context)
  - latency breakdowns for performance monitoring
  - source labels (cache/profile/history/rag) for resolution tracing
"""

import logging
import json
import sys
import time
from contextvars import ContextVar
from typing import Optional
from uuid import uuid4

# Context variable for request-scoped correlation ID
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
user_id_ctx: ContextVar[Optional[str]] = ContextVar("user_id", default=None)


class JSONFormatter(logging.Formatter):
    """
    Formats log records as single-line JSON objects.
    Includes context vars (request_id, user_id) when available.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Inject context vars
        req_id = request_id_ctx.get(None)
        if req_id:
            log_entry["request_id"] = req_id

        uid = user_id_ctx.get(None)
        if uid:
            log_entry["user_id"] = uid

        # Inject extra fields (latency_ms, source, field_count, etc.)
        for key in ("latency_ms", "source", "field_count", "phase",
                     "cache_hits", "cache_misses", "resolved_count",
                     "total_count", "rag_cached", "similarity"):
            value = getattr(record, key, None)
            if value is not None:
                log_entry[key] = value

        # Exception info
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def setup_logging(debug: bool = False) -> None:
    """
    Configure structured JSON logging for the application.
    
    - Root logger: JSON to stdout
    - Quiets noisy third-party loggers (uvicorn, sqlalchemy)
    - Sets level based on debug flag
    """
    level = logging.DEBUG if debug else logging.INFO

    # Create JSON handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter(datefmt="%Y-%m-%dT%H:%M:%S"))

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Application loggers
    for logger_name in ("neuroapply", "neuroapply.resolver", "neuroapply.cache",
                        "neuroapply.rag", "neuroapply.auth", "neuroapply.resume"):
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)

    # Quiet third-party loggers
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error",
                 "sqlalchemy.engine", "httpx", "openai",
                 "passlib", "passlib.utils.compat", "passlib.registry"):
        logging.getLogger(name).setLevel(logging.WARNING)

    logging.getLogger("neuroapply").info("Structured JSON logging initialized")


def get_logger(name: str) -> logging.Logger:
    """Get a namespaced logger under the neuroapply hierarchy."""
    return logging.getLogger(f"neuroapply.{name}")


# ------------------------------------------------------------------
# Latency timer helper
# ------------------------------------------------------------------

class LatencyTimer:
    """
    Context manager for timing code blocks with structured logging.
    
    Usage:
        with LatencyTimer("cache_lookup", logger) as t:
            result = await cache.get(key)
        # Automatically logs: {"phase": "cache_lookup", "latency_ms": 0.42, ...}
    """

    def __init__(self, phase: str, logger: logging.Logger, **extra):
        self.phase = phase
        self.logger = logger
        self.extra = extra
        self.start_time = None
        self.elapsed_ms = 0.0

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed_ms = (time.perf_counter() - self.start_time) * 1000
        self.logger.info(
            f"Phase completed: {self.phase}",
            extra={
                "phase": self.phase,
                "latency_ms": round(self.elapsed_ms, 3),
                **self.extra,
            },
        )
        return False  # Don't suppress exceptions
