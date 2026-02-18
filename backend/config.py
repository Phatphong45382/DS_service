import os

class Settings:
    # App Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Malee Sales App API"
    
    # Dataiku Settings
    DATAIKU_HOST: str = os.getenv("DATAIKU_HOST", "REDACTED_HOST")
    API_KEY: str = os.getenv("API_KEY", "REDACTED_API_KEY")
    PROJECT_KEY: str = os.getenv("PROJECT_KEY", "MALEE_NEW")
    
    # Dashboard Settings
    PROJECT_KEY_DASHBOARD: str = os.getenv("PROJECT_KEY_DASHBOARD", "MALEE_NEW")
    DATASET_DASHBOARD_SUMMARY: str = os.getenv("DATASET_DASHBOARD_SUMMARY", "sale_data_final_1")
    DATASET_ANALYTICS_DASHBOARD: str = os.getenv("DATASET_ANALYTICS_DASHBOARD", "join_data_cl_fill_prepared")
    
    # Resources
    FOLDER_ID: str = os.getenv("FOLDER_ID", "OztgS7aU")
    RESULTS_FOLDER_ID: str = os.getenv("RESULTS_FOLDER_ID", "pOjzy3fq") 
    SCENARIO_ID: str = os.getenv("SCENARIO_ID", "TEST")
    DATASET_NAME: str = os.getenv("DATASET_NAME", "sale_data_final_1")

settings = Settings()
