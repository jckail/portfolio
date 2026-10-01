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
# so a misconfigured deployment fails fast with a clear error. This is the
# single source of truth: list only what the app actually reads. PRODUCTION_URL
# and RESUME_FILE were required here but never read (the resume filename comes
# from aboutme.json), so they are optional settings now.
REQUIRED_ENV_VARS: tuple[str, ...] = (
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE",
    "ALLOWED_ORIGINS",
    "PORT",
    "ADMIN_EMAIL",
    "SENDGRID_API_KEY",
)
# ANTHROPIC_API_KEY / VERTEX_API_KEY are deliberately not required: the chat
# assistant needs one of them, and without either it reports itself
# unavailable instead of stopping the whole site from booting.

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
    # Secret. Sent only in the x-goog-api-key header, never logged or put in a URL.
    vertex_api_key: str
    # "vertex" or "anthropic"; see _resolve_chat_provider.
    chat_provider: str
    chat_model: str
    chat_fallback_model: str
    chat_max_tokens: int
    # Tokens per UTC day per instance; chat reports unavailable once spent.
    chat_daily_token_budget: int

    # Email
    sendgrid_api_key: str
    contact_sender_email: str
    # Optional. Revealed only through POST /api/contact/phone after a visitor
    # leaves an email address, so the number never ships in git-tracked JSON
    # or the public contact payload. Empty means the endpoint answers 503.
    contact_phone: str

    # Application
    admin_email: str
    resume_file: str
    allowed_origins: tuple[str, ...]
    production_url: str
    port: int
    git_commit: str
    dev_mode: bool

    # Platform / proxy trust
    on_cloud_run: bool
    trust_forwarded_for: bool
    trusted_proxy_hops: int

    # Observability (defaulted so a Settings built by hand in a test still works)
    gcp_project_id: str = "portfolio-383615"
    service_name: str = "quickresume"
    access_log_enabled: bool = True
    # Optional independent Python lab. Empty keeps the generated catalog available.
    dataplayground_api_url: str = ""

    @property
    def chat_available(self) -> bool:
        """Whether the AI assistant can serve requests."""
        key = self.vertex_api_key if self.chat_provider == "vertex" else self.anthropic_api_key
        return bool(key)


def _parse_origins(raw: str) -> tuple[str, ...]:
    return tuple(origin.strip() for origin in raw.split(",") if origin.strip())


DEFAULT_CHAT_MODELS = {"vertex": "gemini-3.1-flash-lite", "anthropic": "claude-haiku-4-5"}


def _resolve_chat_provider(raw: str, vertex_api_key: str) -> str:
    """Pick the chat provider: explicit CHAT_PROVIDER, else Vertex when its key exists."""
    choice = raw.strip().lower()
    if choice in DEFAULT_CHAT_MODELS:
        return choice
    return "vertex" if vertex_api_key else "anthropic"


def _parse_bool(raw: str) -> bool:
    return raw.lower() in ("1", "true", "yes")


def _forwarded_for_trust(on_cloud_run: bool) -> bool:
    """Whether X-Forwarded-For can be used to identify the client.

    The header is only meaningful when a proxy we control appends to it. Cloud
    Run's Google front end always appends the real peer, so trust defaults on
    there (K_SERVICE is set by the platform). Anywhere else - local, docker
    compose - the caller reaches the app directly and would pick their own
    rate-limit bucket, so trust is off unless explicitly configured.
    An explicit TRUST_FORWARDED_FOR wins either way.
    """
    explicit = os.getenv("TRUST_FORWARDED_FOR", "").strip()
    if explicit:
        return _parse_bool(explicit)
    if os.getenv("TRUSTED_PROXY_HOPS", "").strip():
        return True
    return on_cloud_run


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    on_cloud_run = bool(os.getenv("K_SERVICE"))
    vertex_api_key = os.getenv("VERTEX_API_KEY", "").strip()
    chat_provider = _resolve_chat_provider(os.getenv("CHAT_PROVIDER", ""), vertex_api_key)
    return Settings(
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role=os.getenv("SUPABASE_SERVICE_ROLE", ""),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        vertex_api_key=vertex_api_key,
        chat_provider=chat_provider,
        chat_model=os.getenv("CHAT_MODEL", "").strip() or DEFAULT_CHAT_MODELS[chat_provider],
        chat_fallback_model=os.getenv("CHAT_FALLBACK_MODEL", "").strip() or "gemini-2.5-flash",
        chat_max_tokens=int(os.getenv("CHAT_MAX_TOKENS", "1024")),
        chat_daily_token_budget=int(os.getenv("CHAT_DAILY_TOKEN_BUDGET", "") or "2000000"),
        sendgrid_api_key=os.getenv("SENDGRID_API_KEY", ""),
        contact_sender_email=os.getenv(
            "CONTACT_SENDER_EMAIL", "assistant@jordan-kail.com"
        ),
        contact_phone=os.getenv("CONTACT_PHONE", "").strip(),
        admin_email=os.getenv("ADMIN_EMAIL", ""),
        resume_file=os.getenv("RESUME_FILE", ""),
        allowed_origins=_parse_origins(
            os.getenv("ALLOWED_ORIGINS", _DEFAULT_DEV_ORIGINS)
        ),
        production_url=os.getenv("PRODUCTION_URL", ""),
        port=int(os.getenv("PORT", "8080")),
        git_commit=os.getenv("GIT_COMMIT", ""),
        dev_mode=_parse_bool(os.getenv("DEV_MODE", "")),
        gcp_project_id=os.getenv("GCP_PROJECT_ID", "").strip() or "portfolio-383615",
        service_name=os.getenv("K_SERVICE", "").strip() or "quickresume",
        access_log_enabled=_parse_bool(os.getenv("ACCESS_LOG", "true")),
        dataplayground_api_url=os.getenv("DATAPLAYGROUND_API_URL", "").strip(),
        on_cloud_run=on_cloud_run,
        trust_forwarded_for=_forwarded_for_trust(on_cloud_run),
        trusted_proxy_hops=max(0, int(os.getenv("TRUSTED_PROXY_HOPS", "") or "0")),
    )


def missing_required_vars() -> list[str]:
    """Return required environment variables that are unset or empty."""
    return [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
