"""
NeuroApply AI — OpenTelemetry Tracing
Distributed tracing with per-span latency for every resolution phase.

Trace hierarchy for the hot path:
  resolve_fields (root)
  ├── batch_cache_check        (Redis mget)
  ├── resolve_single_field     (per cache-miss)
  │   ├── cache_lookup         (Redis get)
  │   ├── field_mapping        (rapidfuzz)
  │   ├── profile_lookup       (Postgres/Redis)
  │   ├── history_lookup       (Postgres)
  │   ├── rag_cache_check      (Redis)
  │   └── rag_vector_query     (pgvector + OpenAI embedding)
  └── response_build
"""

import functools
from typing import Optional, Callable, Any

from app.config import settings

# ------------------------------------------------------------------
# Conditional OTEL import — gracefully degrade if not installed
# ------------------------------------------------------------------

_tracer = None
_tracing_enabled = False

try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import (
        BatchSpanProcessor,
        ConsoleSpanExporter,
    )
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.trace import StatusCode

    _OTEL_AVAILABLE = True
except ImportError:
    _OTEL_AVAILABLE = False


def setup_tracing(service_name: str = "neuroapply-backend") -> None:
    """
    Initialize OpenTelemetry tracing.
    
    In development: exports spans to console (JSON).
    In production: swap ConsoleSpanExporter for OTLPSpanExporter
    pointing at your collector (Jaeger, Tempo, Datadog, etc.).
    """
    global _tracer, _tracing_enabled

    if not _OTEL_AVAILABLE:
        import logging
        logging.getLogger("neuroapply").warning(
            "OpenTelemetry packages not installed — tracing disabled. "
            "Install with: pip install opentelemetry-api opentelemetry-sdk"
        )
        return

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": "0.1.0",
            "deployment.environment": "development" if settings.debug else "production",
        }
    )

    provider = TracerProvider(resource=resource)

    # Development: console exporter (human-readable spans)
    # Production: swap for OTLPSpanExporter(endpoint="http://otel-collector:4317")
    if settings.debug:
        processor = BatchSpanProcessor(ConsoleSpanExporter())
    else:
        # For production, use OTLP exporter (requires opentelemetry-exporter-otlp)
        # from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        # processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
        processor = BatchSpanProcessor(ConsoleSpanExporter())

    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    _tracer = trace.get_tracer("neuroapply", "0.1.0")
    _tracing_enabled = True


def get_tracer():
    """Get the application tracer (or a no-op if not initialized)."""
    global _tracer
    if _tracer is None:
        if _OTEL_AVAILABLE:
            _tracer = trace.get_tracer("neuroapply", "0.1.0")
        else:
            return _NoOpTracer()
    return _tracer


# ------------------------------------------------------------------
# Traced span context manager
# ------------------------------------------------------------------

class traced_span:
    """
    Context manager for creating traced spans with attributes.
    
    Usage:
        with traced_span("cache_lookup", user_id=str(uid)) as span:
            result = await cache.get(key)
            span.set_attribute("cache.hit", result is not None)
    
    Gracefully degrades to no-op if OpenTelemetry is not installed.
    """

    def __init__(self, name: str, **attributes):
        self.name = name
        self.attributes = attributes
        self._span = None

    def __enter__(self):
        tracer = get_tracer()
        if isinstance(tracer, _NoOpTracer):
            return _NoOpSpan()

        self._span = tracer.start_span(self.name)
        for k, v in self.attributes.items():
            self._span.set_attribute(k, v)
        return self._span

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._span is None:
            return False
        if exc_type is not None and _OTEL_AVAILABLE:
            self._span.set_status(StatusCode.ERROR, str(exc_val))
            self._span.record_exception(exc_val)
        self._span.end()
        return False


# ------------------------------------------------------------------
# No-op fallbacks (when OTEL not installed)
# ------------------------------------------------------------------

class _NoOpSpan:
    """No-op span for when tracing is disabled."""
    def set_attribute(self, key: str, value: Any): pass
    def set_status(self, *args, **kwargs): pass
    def record_exception(self, *args, **kwargs): pass
    def end(self): pass
    def add_event(self, *args, **kwargs): pass


class _NoOpTracer:
    """No-op tracer for when tracing is disabled."""
    def start_span(self, name: str, **kwargs):
        return _NoOpSpan()

    def start_as_current_span(self, name: str, **kwargs):
        return _no_op_context()


class _no_op_context:
    """No-op context manager."""
    def __enter__(self):
        return _NoOpSpan()
    def __exit__(self, *args):
        return False
