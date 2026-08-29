import json
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
    # Declared as a plain string, NOT List[str]: pydantic-settings JSON-decodes
    # complex types straight from the environment, so a comma-separated value
    # would raise SettingsError and crash the app at boot before any validator
    # could normalise it. Parsing happens in allowed_origins instead, which
    # accepts either a JSON array or a comma-separated list.
    #
    # Railway builds the Dockerfile directly and never reads
    # docker-compose.yml, so production origins must be listed here or supplied
    # via the CORS_ORIGINS / FRONTEND_URL environment variables.
    cors_origins: str = (
        "http://localhost:5173,"
        "http://localhost:3000,"
        "http://localhost:80,"
        "https://pulseboard-production-b09e.up.railway.app"
    )

    # Convenience for hosting platforms: set FRONTEND_URL to the deployed site
    # and it is added to the allow-list without editing this file.
    frontend_url: str = ""

    environment: str = "development"

    @property
    def allowed_origins(self) -> List[str]:
        """
        Every origin permitted to call this API.

        Accepts a JSON array or a comma-separated string, because platform
        dashboards make JSON awkward to type. Trailing slashes are stripped:
        a browser's Origin header never has one, so "https://site.com/" in the
        allow-list would silently never match.
        """
        raw = self.cors_origins or ""
        if isinstance(raw, (list, tuple)):
            parts = list(raw)
        else:
            text = str(raw).strip()
            if not text:
                parts = []
            elif text.startswith("["):
                try:
                    parts = json.loads(text)
                except json.JSONDecodeError:
                    parts = []
            else:
                parts = text.split(",")

        origins: List[str] = []
        for part in parts:
            origin = str(part).strip().rstrip("/")
            if origin and origin not in origins:
                origins.append(origin)

        if self.frontend_url:
            extra = self.frontend_url.strip().rstrip("/")
            if extra and extra not in origins:
                origins.append(extra)
        return origins

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
