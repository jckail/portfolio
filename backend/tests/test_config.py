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
    assert "ANTHROPIC_API_KEY" in REQUIRED_ENV_VARS
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
