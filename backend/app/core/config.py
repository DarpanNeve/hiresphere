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

    # MongoDB Connection Pool Settings
    MONGODB_MIN_POOL_SIZE: int = 10
    MONGODB_MAX_POOL_SIZE: int = 100
    MONGODB_MAX_IDLE_TIME_MS: int = 10000
    MONGODB_CONNECT_TIMEOUT_MS: int = 2000
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: int = 2000

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

    # Rate limiting settings
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    RATE_LIMIT_BURST: int = int(os.getenv("RATE_LIMIT_BURST", "10"))
    RATE_LIMIT_STORAGE: str = "memory"  # Options: memory, redis

    # Redis settings (for rate limiting and caching)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_MAX_CONNECTIONS: int = 100

    # Cache settings
    CACHE_TTL: int = 300  # 5 minutes
    CACHE_ENABLED: bool = True

    # LLM timeout settings
    LLM_REQUEST_TIMEOUT: int = 120  # seconds
    LLM_MAX_RETRIES: int = 3
    LLM_RETRY_DELAY: int = 1  # seconds

    # Security headers
    SECURITY_HEADERS: bool = os.getenv("SECURITY_HEADERS", "True").lower() == "true"

    class Config:
        env_file = ".env"


settings = Settings()