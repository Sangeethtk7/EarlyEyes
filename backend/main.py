"""
EarlyEyes FastAPI application entry point.

Wires together all routers, middleware, exception handlers, and startup hooks.
"""
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from api.auth.router import router as auth_router
from api.clinician.router import router as clinician_router
from api.reports.router import router as reports_router
from api.videos.router import router as videos_router
from core.config import settings
from core.database import init_db
from core.logging import CorrelationIdMiddleware, get_logger

logger = get_logger(__name__)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.

    On startup:
    - Creates the ``uploads/`` directory if it does not exist.
    - Initialises all database tables via :func:`~core.database.init_db`.

    On shutdown:
    - Performs any necessary cleanup (currently none).
    """
    # ── Startup ───────────────────────────────────────────────────────────────
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Upload directory ready", extra={"path": str(upload_dir.resolve())})

    await init_db()
    logger.info("Database tables initialised")

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("EarlyEyes API shutting down")


# ── Application factory ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production-grade autism screening platform API. "
        "Provides secure video upload, AI analysis, and clinical reporting."
    ),
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# ── Middleware stack (order matters — applied bottom-to-top) ──────────────────

# 1. Correlation ID (outermost — tags every request with a trace ID)
app.add_middleware(CorrelationIdMiddleware)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. SlowAPI rate limiting middleware
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# ── Rate-limit exceeded handler ───────────────────────────────────────────────
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Global unhandled exception handler ───────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all exception handler.

    Logs the full traceback for internal investigation and returns a
    generic, non-leaking error response to the client.

    Args:
        request: The incoming HTTP request.
        exc: The unhandled exception.

    Returns:
        JSON response with a 500 status and a safe error envelope.
    """
    logger.error(
        "Unhandled exception",
        extra={
            "path": request.url.path,
            "method": request.method,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        },
    )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "INTERNAL_ERROR",
            "message": "Something went wrong. Please try again.",
        },
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(videos_router)
app.include_router(reports_router)
app.include_router(clinician_router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """
    Lightweight health check endpoint used by load balancers and monitoring.

    Returns:
        Dictionary with application name, version, and status.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
    }
