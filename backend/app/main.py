from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limit import limiter
from app.routers import auth, users, workouts, sleep, health, badges, community, notifications, debug
from app.services.scheduler_service import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── Rate limiting (slowapi) ─────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ────────────────────────────────────────────────────────────────────────
# 웹 브라우저 개발/배포 origin만 허용 (RN 앱은 CORS 미적용).
# origin 목록은 settings.CORS_ORIGINS / .env 의 CORS_ORIGINS 로 관리.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/v1")
app.include_router(users.router,         prefix="/api/v1")
app.include_router(workouts.router,      prefix="/api/v1")
app.include_router(sleep.router,         prefix="/api/v1")
app.include_router(health.router,        prefix="/api/v1")
app.include_router(badges.router,        prefix="/api/v1")
app.include_router(community.router,     prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(debug.router,         prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
