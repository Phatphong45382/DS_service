
import asyncio
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.auth import enabled as auth_enabled, require_token
from backend.config import settings
from backend.logging_setup import configure_logging, log_requests
from backend.routers import dashboard, health, analytics, ai, predict, runs, auth as auth_router

configure_logging()
logger = logging.getLogger(__name__)

def seed_baseline_run() -> None:
    """One real Run, so Forecast and Runs are never empty.

    On Render STORE_BACKEND=local, which means the Runs live on the container's own disk and a
    redeploy leaves none (#3 switches the store to DynamoDB, which needs an IAM key from an admin).
    Only ever runs when the store is empty, and the Run says in its notes that it was automatic.
    """
    try:
        from backend.runs import service

        if service.list_runs():
            return
        record = service.create_run(horizon=6, notes="Baseline created automatically at startup")
        logger.info("seeded %s (%s)", record["run_id"], record["status"])
    except Exception:  # a demo with no Run is bad; a backend that will not boot is worse
        logger.warning("could not seed a baseline Run", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # off the event loop: a cold model must not hold the port closed while Render waits for it
    if settings.SEED_RUN_ON_START:
        asyncio.get_running_loop().run_in_executor(None, seed_baseline_run)
    yield


def create_app() -> FastAPI:
    production = settings.ENV == "production"
    if production and not auth_enabled():
        raise RuntimeError("DEMO_PASSWORD must be set when ENV=production: the demo would be open to anyone")
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        # no API surface listing in production: nothing for a scanner to enumerate
        openapi_url=None if production else f"{settings.API_V1_STR}/openapi.json",
        docs_url=None if production else "/docs",
        redoc_url=None if production else "/redoc",
        lifespan=lifespan,
    )

    # Starlette applies the last-added middleware outermost, so add them inside-out:
    # CORS must wrap everything or the browser cannot read a 401, and the request log must see it.
    app.middleware("http")(require_token)
    app.middleware("http")(log_requests)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include Routers
    app.include_router(auth_router.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
    app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
    app.include_router(health.router, prefix=f"{settings.API_V1_STR}/health", tags=["health"])
    app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
    app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
    app.include_router(predict.router, prefix=f"{settings.API_V1_STR}/predict", tags=["predict"])
    app.include_router(runs.router, prefix=f"{settings.API_V1_STR}/runs", tags=["runs"])
    
    return app

app = create_app()

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8080, reload=True)
