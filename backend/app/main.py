import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .config import get_settings
from .database import engine, ensure_schema
from .models import Base
from .routers import auth_router, track_router, analytics_router, ai_router

# ─── Structured JSON logging ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Rate limiter (slowapi) ───────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    logger.info("Database tables verified/created")
    logger.info(f"CORS allow-list: {settings.allowed_origins}")
    yield
    logger.info("Application shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="PulseBoard Analytics API",
        description="PulseBoard — real-time behavioral intelligence. Interactive product analytics that tracks its own usage.",
        version="1.0.0",
        lifespan=lifespan,
    )

    # ── Rate limiting ─────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Request timing / structured logging ───────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        t0 = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.exception(f"Unhandled exception: {exc}")
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})
        ms = (time.perf_counter() - t0) * 1000
        logger.info(
            f"method={request.method} path={request.url.path} "
            f"status={response.status_code} duration_ms={ms:.1f}"
        )
        return response

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth_router)
    app.include_router(track_router)
    app.include_router(analytics_router)
    app.include_router(ai_router)

    @app.get("/health", tags=["system"])
    def health():
        return {"status": "healthy", "version": "1.0.0"}

    return app


app = create_app()
