from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str
    API_V1_STR: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    OPENAI_API_KEY: str
    DID_API_KEY: str
    MONGODB_URL: str
    DATABASE_NAME: str
    DEEPSEEK_API_BASE_URL:str
    DEEPSEEK_API_KEY:str
    DEEPSEEK_MODEL_NAME:str
    DEEPSEEK_ANALYSIS_MODEL:str
# PROJECT_NAME=AI Interviewer
# API_V1_STR=/api
# SECRET_KEY=your-secret-key
# ALGORITHM=HS256
# ACCESS_TOKEN_EXPIRE_MINUTES=3000
# OPENAI_API_KEY=your-openai-key
# DID_API_KEY=your-did-key
# MONGODB_URL=mongodb://localhost:27017
# DATABASE_NAME=ai_interviewer

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
