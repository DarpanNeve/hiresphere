from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Interviewer"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OPENAI_API_KEY: str = ""
    DID_API_KEY: str = ""
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_interviewer"
    OPENAI_API_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL_NAME: str = "gpt-4o-mini"
    # Local LLM settings
    # DEEPSEEK_API_BASE_URL: str = "http://localhost:8000/v1"
    # DEEPSEEK_API_KEY: str = "not-needed-for-local"
    # DEEPSEEK_MODEL_NAME: str = "deepseek-coder"
    # DEEPSEEK_ANALYSIS_MODEL: str = "deepseek-coder"

    # LLM timeout settings
    LLM_REQUEST_TIMEOUT: int = 120  # seconds

    class Config:
        env_file = ".env"


settings = Settings()