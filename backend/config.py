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

    # Single-password login. Empty = no auth (local development); production refuses to start without one.
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "")
    AUTH_SECRET: str = os.getenv("AUTH_SECRET", "")  # defaults to a key derived from DEMO_PASSWORD

    # AWS resources created by scripts/aws_foundation.py; region ap-southeast-7 (Thailand)
    AWS_REGION: str = os.getenv("AWS_REGION", os.getenv("BEDROCK_REGION", "ap-southeast-7"))
    S3_BUCKET: str = os.getenv("S3_BUCKET", "")
    DYNAMODB_TABLE: str = os.getenv("DYNAMODB_TABLE", "demand-demo")
    SAGEMAKER_ENDPOINT: str = os.getenv("SAGEMAKER_ENDPOINT", "demand-demo-forecast")
    # ap-southeast-7 (Thailand) does not offer Serverless Inference, so the endpoint lives in the
    # nearest region that does; data and Runs stay in Thailand. Move it back by setting this.
    SAGEMAKER_REGION: str = os.getenv("SAGEMAKER_REGION", "ap-southeast-1")
    SAGEMAKER_TIMEOUT_SEC: int = int(os.getenv("SAGEMAKER_TIMEOUT_SEC", "25"))  # then fall back to the in-process model

    # Dataset: local Parquet, or the same file read from S3 (DATA_SOURCE=s3)
    DATA_SOURCE: str = os.getenv("DATA_SOURCE", "local")
    DATA_PATH: str = os.getenv("DATA_PATH", str(_REPO_ROOT / "data" / "sales.parquet"))
    S3_DATA_KEY: str = os.getenv("S3_DATA_KEY", "data/sales.parquet")

    # Forecast model: in-process artifact, or the SageMaker Serverless endpoint with this as its fallback
    MODEL_BACKEND: str = os.getenv("MODEL_BACKEND", "local")
    MODEL_PATH: str = os.getenv("MODEL_PATH", str(_REPO_ROOT / "model"))

    # Store for Runs, uploads, documents and prompts: a local directory, or DynamoDB records + S3 blobs
    STORE_BACKEND: str = os.getenv("STORE_BACKEND", "local")
    STORE_PATH: str = os.getenv("STORE_PATH", str(_REPO_ROOT / ".store"))

    # AI backend: gemini (default until the Bedrock quota is raised) or bedrock
    AI_BACKEND: str = os.getenv("AI_BACKEND", "gemini")

    # Claude on Amazon Bedrock. Newer models are reachable only through inference-profile IDs.
    BEDROCK_REGION: str = os.getenv("BEDROCK_REGION", "ap-southeast-7")
    BEDROCK_CLIENT: str = os.getenv("BEDROCK_CLIENT", "invoke")  # invoke = bedrock-runtime path; mantle = Messages-API endpoint
    BEDROCK_MODEL_FAST: str = os.getenv("BEDROCK_MODEL_FAST", "global.anthropic.claude-haiku-4-5-20251001-v1:0")
    BEDROCK_MODEL_BALANCED: str = os.getenv("BEDROCK_MODEL_BALANCED", "global.anthropic.claude-sonnet-4-6")
    BEDROCK_MODEL_ADVANCED: str = os.getenv("BEDROCK_MODEL_ADVANCED", "global.anthropic.claude-opus-4-6-v1")
    BEDROCK_MODEL: str = os.getenv("BEDROCK_MODEL", os.getenv("BEDROCK_MODEL_BALANCED", "global.anthropic.claude-sonnet-4-6"))

    # Gemini AI Settings
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
