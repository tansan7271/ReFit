from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, users, workouts, sleep, badges, community, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: DB 연결 확인은 alembic 마이그레이션으로 처리
    yield
    # shutdown


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 중 전체 허용; 프로덕션에서는 앱 도메인만 지정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/v1")
app.include_router(users.router,         prefix="/api/v1")
app.include_router(workouts.router,      prefix="/api/v1")
app.include_router(sleep.router,         prefix="/api/v1")
app.include_router(badges.router,        prefix="/api/v1")
app.include_router(community.router,     prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
