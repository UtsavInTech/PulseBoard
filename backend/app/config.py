from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/analytics_db"
    secret_key: str = "CHANGE_THIS_SECRET_IN_PRODUCTION_32CHARS"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    redis_url: str = "redis://localhost:6379"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
    ]
    environment: str = "development"

    # ── OpenAI — server-side only; never returned to a client ─────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1"
    openai_timeout_seconds: int = 45
    # Only sent when the configured model is a reasoning model (gpt-5 / o-series);
    # non-reasoning models reject the parameter. Options: minimal|low|medium|high.
    openai_reasoning_effort: str = "low"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
