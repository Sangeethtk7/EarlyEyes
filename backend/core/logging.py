"""
Structured JSON logging and correlation-ID middleware.
Every log entry includes: timestamp, level, message, correlation_id.
"""
import logging
import uuid
from contextvars import ContextVar
from json import dumps
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

# ── Correlation-ID context variable ───────────────────────────────────────────
# Stored in a ContextVar so it is local to each async task / request.
_correlation_id_var: ContextVar[str] = ContextVar(
    "correlation_id", default="no-correlation-id"
)


def get_correlation_id() -> str:
    """Return the correlation ID for the current request context."""
    return _correlation_id_var.get()


# ── JSON log formatter ────────────────────────────────────────────────────────
class _JsonFormatter(logging.Formatter):
    """
    Custom logging formatter that serialises each record as a single JSON line.
    Fixed fields: timestamp, level, logger, message, correlation_id.
    Any ``extra`` kwargs passed to the logger are merged in.
    """

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        log_entry = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }
        # Merge any extra fields attached to the record.
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "created", "filename", "funcName",
                "levelname", "levelno", "lineno", "module", "msecs",
                "message", "pathname", "process", "processName",
                "relativeCreated", "stack_info", "thread", "threadName",
                "exc_info", "exc_text",
            ):
                log_entry[key] = value
        if record.exc_info:
            log_entry["exc_info"] = self.formatException(record.exc_info)
        return dumps(log_entry)


def get_logger(name: str) -> logging.Logger:
    """
    Return a logger configured with the JSON formatter.

    Args:
        name: Logger name (typically ``__name__`` of the calling module).

    Returns:
        Configured :class:`logging.Logger` instance.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(_JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        logger.propagate = False
    return logger


# ── Correlation-ID middleware ─────────────────────────────────────────────────
class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware that generates a UUID correlation ID for every incoming
    HTTP request and:

    * Stores it in the async context variable so loggers can access it.
    * Attaches it to ``request.state.correlation_id``.
    * Echoes it back in the ``X-Correlation-ID`` response header.
    """

    def __init__(self, app: ASGIApp) -> None:
        """Initialise the middleware wrapping *app*."""
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Generate or propagate a correlation ID, then pass control to the
        next middleware / route handler.
        """
        # Honour an existing correlation ID forwarded by an upstream proxy.
        correlation_id = request.headers.get("X-Correlation-ID") or str(
            uuid.uuid4()
        )
        token = _correlation_id_var.set(correlation_id)
        request.state.correlation_id = correlation_id

        try:
            response: Response = await call_next(request)
        finally:
            _correlation_id_var.reset(token)

        response.headers["X-Correlation-ID"] = correlation_id
        return response
