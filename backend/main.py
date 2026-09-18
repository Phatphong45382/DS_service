
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

from backend.config import settings
from backend.logging_setup import configure_logging, log_requests
from backend.routers import dashboard, health, analytics, ai, predict, runs

configure_logging()
logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    production = settings.ENV == "production"
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        # no API surface listing in production: nothing for a scanner to enumerate
        openapi_url=None if production else f"{settings.API_V1_STR}/openapi.json",
        docs_url=None if production else "/docs",
        redoc_url=None if production else "/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.middleware("http")(log_requests)

    # Include Routers
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
