import os
from pathlib import Path

# Load .env file if it exists (for local dev)
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

_REPO_ROOT = Path(__file__).resolve().parent.parent


class Settings:
    # App Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Sales Forecast App API"
    ENV: str = os.getenv("ENV", "development")  # "production" hides docs and enforces CORS_ORIGINS
    CORS_ORIGINS: list = [o.strip() for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://demand.forecast.phatphong.work"
    ).split(",") if o.strip()]
    AI_TIMEOUT_SEC: int = int(os.getenv("AI_TIMEOUT_SEC", "30"))

    # Dataset: local Parquet now, S3 with the AWS backends ticket
    DATA_SOURCE: str = os.getenv("DATA_SOURCE", "local")
    DATA_PATH: str = os.getenv("DATA_PATH", str(_REPO_ROOT / "data" / "sales.parquet"))

    # Forecast model: in-process artifact now, SageMaker endpoint with the AWS backends ticket
    MODEL_BACKEND: str = os.getenv("MODEL_BACKEND", "local")
    MODEL_PATH: str = os.getenv("MODEL_PATH", str(_REPO_ROOT / "model"))

    # Store for Runs, uploads, documents and prompts: local directory now, DynamoDB + S3 with the AWS ticket
    STORE_BACKEND: str = os.getenv("STORE_BACKEND", "local")
    STORE_PATH: str = os.getenv("STORE_PATH", str(_REPO_ROOT / ".store"))

    # Gemini AI Settings (replaced by Bedrock in the AI ticket)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    GEMINI_AVAILABLE_MODELS: list = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-3-flash-preview",
    ]

    # Email (Gmail SMTP) Settings — used locally
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

    # Resend API — used on deployed environments (takes priority over SMTP)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM: str = os.getenv("RESEND_FROM", "noreply@resend.dev")


settings = Settings()
