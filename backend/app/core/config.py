from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Interviewer"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL_NAME: str = "gpt-3.5-turbo"
    DID_API_KEY: str = ""
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_interviewer"

    # Interview settings
    DEFAULT_QUESTION_COUNT: int = 5
    MIN_QUESTION_COUNT: int = 3
    MAX_QUESTION_COUNT: int = 10

    # Email settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAIL_FROM: str = "noreply@aiinterviewer.com"

    # Local LLM settings (fallback)
    # DEEPSEEK_API_BASE_URL: str = "http://localhost:8000/v1"
    # DEEPSEEK_API_KEY: str = "not-needed-for-local"
    # DEEPSEEK_MODEL_NAME: str = "deepseek-coder"
    # DEEPSEEK_ANALYSIS_MODEL: str = "deepseek-coder"

    # LLM timeout settings
    LLM_REQUEST_TIMEOUT: int = 120  # seconds

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # Security headers
    SECURITY_HEADERS: bool = os.getenv("SECURITY_HEADERS", "True").lower() == "true"
    class Config:
        env_file = ".env"


settings = Settings()