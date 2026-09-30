"""
Central configuration for MAITRI backend.
Reads from environment variables / .env file. Never hardcode secrets here.
"""
import os
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        extra="ignore",
    )

    # LLM (Groq)
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")

    # Application database (SQLite now, swappable to Postgres later)
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./maitri.db")

    # ChromaDB
    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "../data/chroma")

    # Neo4j
    neo4j_uri: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user: str = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "maitri_password")

    # Misc
    mock_data_dir: Path = Path(os.getenv("MOCK_DATA_DIR", str(PROJECT_ROOT / "mock-data")))
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:5175,http://127.0.0.1:5175"
    )

    @property
    def allowed_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @field_validator("mock_data_dir")
    @classmethod
    def resolve_mock_data_dir(cls, path: Path) -> Path:
        if not path.is_absolute():
            path = BACKEND_DIR / path
        return path.resolve()


settings = Settings()
