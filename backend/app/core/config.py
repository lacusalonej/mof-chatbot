"""Application configuration using pydantic-settings.

โหลดค่าจากไฟล์ .env และ environment variables
ทุกค่าต้องกำหนดผ่าน environment variable เท่านั้น
ห้ามเขียนค่า segret ลงใน source code โดยตรง
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "MOF PSDG AI Chatbot"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = Field(..., description="Secret key for signing tokens and hashing")

    # Backend
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # Frontend
    FRONTEND_PORT: int = 3000

    # Database
    DATABASE_URL: str = Field("sqlite:///./data/app.db", description="SQLAlchemy database URL")

    # AI Provider
    AI_PROVIDER: str = Field("demo", description="openai | anthropic | ollama | demo")

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-haiku-20240307"

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # Vector Search (ChromaDB)
    CHROMA_PERSIST_DIRECTORY: str = "./data/chroma"
    CHROMA_COLLECTION_NAME: str = "mof_psdg_knowledge"

    # Document Processing
    MAX_FILE_SIZE_MB: int = 16
    ALLOWED_FILE_TYPES: str = "pdf,docx,doc,xlsx,csv,txt,md,html"
    UPLOAD_DIRECTORY: str = "./uploads"

    # Security
    SESSION_TIMEOUT_MINUTES: int = 60
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 30
    BCRYPT_ROUNDS: int = 12

    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60

    # Trial Link
    TRIAL_LINK_DEFAULT_EXPIRY_DAYS: int = 7
    TRIAL_LINK_MAX_USAGES: int = 100

    # Document Classification
    DOCUMENT_CLASSIFICATION_PUBLIC: str = "PUBLIC"
    DOCUMENT_CLASSIFICATION_INTERNAL: str = "INTERNAL"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """คืนค่าการตั้งค่าแบบ singleton (cached)"""
    return Settings()


settings = get_settings()