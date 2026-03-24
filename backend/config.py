import os

class Settings:
    # App Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Sales Forecast App API"
    
    # Dataiku Settings
    DATAIKU_HOST: str = os.getenv("DATAIKU_HOST", "")
    API_KEY: str = os.getenv("API_KEY", "")
    PROJECT_KEY: str = os.getenv("PROJECT_KEY", "MALEE_NEW")
    
    # Dashboard Settings
    PROJECT_KEY_DASHBOARD: str = os.getenv("PROJECT_KEY_DASHBOARD", "MALEE_NEW")
    DATASET_DASHBOARD_SUMMARY: str = os.getenv("DATASET_DASHBOARD_SUMMARY", "sale_data_final_1")
    DATASET_ANALYTICS_DASHBOARD: str = os.getenv("DATASET_ANALYTICS_DASHBOARD", "join_data_cl_fill_prepared")
    
    # Gemini AI Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    GEMINI_AVAILABLE_MODELS: list = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-3-flash-preview",
    ]

    # Email (Gmail SMTP) Settings
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

    # Dataiku Prediction API
    DATAIKU_PREDICT_URL: str = os.getenv("DATAIKU_PREDICT_URL", "")

    # Resources
    FOLDER_ID: str = os.getenv("FOLDER_ID", "OztgS7aU")
    RESULTS_FOLDER_ID: str = os.getenv("RESULTS_FOLDER_ID", "pOjzy3fq") 
    SCENARIO_ID: str = os.getenv("SCENARIO_ID", "TEST")
    DATASET_NAME: str = os.getenv("DATASET_NAME", "sale_data_final_1")

settings = Settings()
