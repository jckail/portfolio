"""Centralized application configuration.

All environment access lives here so the rest of the codebase imports typed
settings instead of calling os.getenv at scattered call sites. Values are
read once at first access and are immutable afterwards.
"""
import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

# Variables that must be present for the app to boot; validated in main.py
# so a misconfigured deployment fails fast with a clear error.
REQUIRED_ENV_VARS: tuple[str, ...] = (
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE",
    "ALLOWED_ORIGINS",
    "PRODUCTION_URL",
    "PORT",
    "ADMIN_EMAIL",
    "RESUME_FILE",
    "ANTHROPIC_API_KEY",
    "SENDGRID_API_KEY",
)

# Starlette requires exact origin strings (wildcard ports never match), so
# the default lists the common local dev servers explicitly.
_DEFAULT_DEV_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:8080,http://127.0.0.1:8080"
)


@dataclass(frozen=True)
class Settings:
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role: str

    # AI assistant
    anthropic_api_key: str
    chat_model: str
    chat_max_tokens: int

    # Email
    sendgrid_api_key: str
    contact_sender_email: str

    # Application
    admin_email: str
    resume_file: str
    allowed_origins: tuple[str, ...]
    production_url: str
    port: int
    git_commit: str
    dev_mode: bool

    @property
    def chat_available(self) -> bool:
        """Whether the AI assistant can serve requests."""
        return bool(self.anthropic_api_key)


def _parse_origins(raw: str) -> tuple[str, ...]:
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


def _parse_bool(raw: str) -> bool:
    return raw.lower() in ("1", "true", "yes")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role=os.getenv("SUPABASE_SERVICE_ROLE", ""),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        # Claude Haiku 4.5: fastest model with near-frontier intelligence.
        chat_model=os.getenv("CHAT_MODEL", "claude-haiku-4-5"),
        chat_max_tokens=int(os.getenv("CHAT_MAX_TOKENS", "1024")),
        sendgrid_api_key=os.getenv("SENDGRID_API_KEY", ""),
        contact_sender_email=os.getenv(
            "CONTACT_SENDER_EMAIL", "assistant@jordan-kail.com"
        ),
        admin_email=os.getenv("ADMIN_EMAIL", ""),
        resume_file=os.getenv("RESUME_FILE", ""),
        allowed_origins=_parse_origins(
            os.getenv("ALLOWED_ORIGINS", _DEFAULT_DEV_ORIGINS)
        ),
        production_url=os.getenv("PRODUCTION_URL", ""),
        port=int(os.getenv("PORT", "8080")),
        git_commit=os.getenv("GIT_COMMIT", ""),
        dev_mode=_parse_bool(os.getenv("DEV_MODE", "")),
    )


def missing_required_vars() -> list[str]:
    """Return required environment variables that are unset or empty."""
    return [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
