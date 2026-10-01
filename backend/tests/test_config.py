"""Settings module: parsing helpers and required-var validation."""
from backend.app.config import (
    REQUIRED_ENV_VARS,
    _parse_bool,
    _parse_origins,
    get_settings,
    missing_required_vars,
)


def test_settings_load_from_test_environment():
    settings = get_settings()
    assert settings.supabase_url == "https://example.supabase.co"
    assert settings.admin_email == "admin@example.com"
    assert settings.chat_available is True
    assert settings.port == 8080


def test_no_required_vars_missing_in_tests():
    assert missing_required_vars() == []
    # Sanity: the canonical list still contains the core credentials
    assert "SENDGRID_API_KEY" in REQUIRED_ENV_VARS
    # Either chat key is enough; neither stops the site from booting.
    assert "ANTHROPIC_API_KEY" not in REQUIRED_ENV_VARS
    assert "VERTEX_API_KEY" not in REQUIRED_ENV_VARS
    assert "SUPABASE_SERVICE_ROLE" in REQUIRED_ENV_VARS


def test_parse_origins_strips_and_drops_empties():
    assert _parse_origins(" http://a.com , http://b.com ,, ") == (
        "http://a.com",
        "http://b.com",
    )


def test_parse_bool_variants():
    assert _parse_bool("true") is True
    assert _parse_bool("TRUE") is True
    assert _parse_bool("1") is True
    assert _parse_bool("yes") is True
    assert _parse_bool("") is False
    assert _parse_bool("false") is False
    assert _parse_bool("0") is False


def test_contact_phone_is_optional_and_read_from_env(monkeypatch):
    assert "CONTACT_PHONE" not in REQUIRED_ENV_VARS
    get_settings.cache_clear()
    try:
        monkeypatch.setenv("CONTACT_PHONE", "  555-0100 ")
        assert get_settings().contact_phone == "555-0100"
        get_settings.cache_clear()
        monkeypatch.delenv("CONTACT_PHONE")
        assert get_settings().contact_phone == ""
    finally:
        monkeypatch.undo()
        get_settings.cache_clear()


def test_chat_provider_defaults_and_models(monkeypatch):
    from backend.app import config

    def load(**env):
        for var in ("CHAT_PROVIDER", "VERTEX_API_KEY", "CHAT_MODEL", "CHAT_FALLBACK_MODEL",
                    "CHAT_DAILY_TOKEN_BUDGET"):
            monkeypatch.delenv(var, raising=False)
        for var, value in env.items():
            monkeypatch.setenv(var, value)
        config.get_settings.cache_clear()
        try:
            return config.get_settings()
        finally:
            config.get_settings.cache_clear()

    try:
        anthropic_default = load()
        assert anthropic_default.chat_provider == "anthropic"
        assert anthropic_default.chat_model == "claude-haiku-4-5"

        vertex_default = load(VERTEX_API_KEY="k")
        assert vertex_default.chat_provider == "vertex"
        assert vertex_default.chat_model == "gemini-3.1-flash-lite"
        assert vertex_default.chat_fallback_model == "gemini-2.5-flash"
        assert vertex_default.chat_daily_token_budget == 2_000_000
        assert vertex_default.chat_available is True

        # Explicit choice wins; availability follows the chosen provider's key.
        forced = load(VERTEX_API_KEY="k", CHAT_PROVIDER="anthropic", ANTHROPIC_API_KEY="")
        assert forced.chat_provider == "anthropic" and forced.chat_available is False

        no_key = load(CHAT_PROVIDER="vertex", CHAT_MODEL="gemini-x", CHAT_DAILY_TOKEN_BUDGET="50")
        assert no_key.chat_available is False
        assert no_key.chat_model == "gemini-x" and no_key.chat_daily_token_budget == 50
    finally:
        monkeypatch.undo()
        config.get_settings.cache_clear()
