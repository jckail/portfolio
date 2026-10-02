"""Edge cases for chat tool-action validation (complements test_chat_actions.py)."""
import pytest

from backend.app.services.chat_actions import (
    ALLOWED_MODAL_KINDS,
    ALLOWED_SECTIONS,
    ALLOWED_THEMES,
    CHAT_TOOLS,
    normalize_tool_action,
)


@pytest.mark.parametrize("raw", [None, "navigate", ["section", "about"], 42, {}])
def test_non_dict_or_empty_input_is_rejected_for_validated_tools(raw):
    assert normalize_tool_action("navigate_section", raw) is None
    assert normalize_tool_action("open_modal", raw) is None
    assert normalize_tool_action("set_theme", raw) is None


def test_values_are_trimmed_and_case_folded():
    assert normalize_tool_action("navigate_section", {"section": "  Projects \n"}) == {
        "action": "navigate", "target": "projects",
    }
    assert normalize_tool_action("set_theme", {"theme": " DARK "}) == {
        "action": "set_theme", "theme": "dark",
    }
    assert normalize_tool_action("open_modal", {"kind": " Project ", "key": " JOBBR "}) == {
        "action": "open_modal", "kind": "project", "key": "jobbr",
    }


@pytest.mark.parametrize("value", [None, 0, ["about"], {"a": 1}, ""])
def test_non_string_section_never_matches_an_allowed_target(value):
    assert normalize_tool_action("navigate_section", {"section": value}) is None


def test_open_modal_rejects_unknown_kind_and_missing_company_key():
    assert normalize_tool_action("open_modal", {"kind": "admin", "key": "x1"}) is None
    assert normalize_tool_action("open_modal", {"kind": "company"}) is None
    assert normalize_tool_action("open_modal", {"kind": "company", "key": "   "}) is None


def test_open_modal_key_length_boundary():
    assert normalize_tool_action("open_modal", {"kind": "company", "key": "a" * 64}) is not None
    assert normalize_tool_action("open_modal", {"kind": "company", "key": "a" * 65}) is None


@pytest.mark.parametrize("key", ["a\nb", "a\x00b", "../x", "x/../y", "ünï", "a%2fb", "a?b=1", "a#b"])
def test_open_modal_rejects_control_and_path_characters(key):
    assert normalize_tool_action("open_modal", {"kind": "company", "key": key}) is None


def test_open_modal_falls_back_to_charset_check_when_data_cannot_load(monkeypatch):
    import backend.app.models as models

    def boom():
        raise RuntimeError("data unavailable")

    monkeypatch.setattr(models, "load_skills", boom)
    # Unknown to the data, but the data is unreadable so only the charset gates it
    assert normalize_tool_action("open_modal", {"kind": "skill", "key": "not_a_skill"}) is not None
    # The charset guard and reserved names still apply
    assert normalize_tool_action("open_modal", {"kind": "skill", "key": "constructor"}) is None
    assert normalize_tool_action("open_modal", {"kind": "skill", "key": "__proto__"}) is None


def test_prefill_contact_drops_blank_and_non_string_fields():
    action = normalize_tool_action(
        "prefill_contact",
        {"from_email": "   ", "subject": 123, "message": ["x"], "to": "attacker@example.com"},
    )
    assert action == {"action": "prefill_contact", "draft": {}}
    assert normalize_tool_action("prefill_contact", None) == {"action": "prefill_contact", "draft": {}}


def test_prefill_contact_bounds_email_and_subject():
    draft = normalize_tool_action(
        "prefill_contact", {"from_email": "a" * 300, "subject": "s" * 300}
    )["draft"]
    assert len(draft["from_email"]) == 200
    assert len(draft["subject"]) == 200


def test_tool_schemas_stay_in_sync_with_the_validator_allowlists():
    tools = {t["name"]: t["input_schema"]["properties"] for t in CHAT_TOOLS}
    assert set(tools["navigate_section"]["section"]["enum"]) == ALLOWED_SECTIONS
    assert set(tools["open_modal"]["kind"]["enum"]) == ALLOWED_MODAL_KINDS
    assert set(tools["set_theme"]["theme"]["enum"]) == ALLOWED_THEMES
    # Every advertised tool has a validator that accepts a well-formed call
    samples = {
        "navigate_section": {"section": "about"},
        "open_modal": {"kind": "contact"},
        "download_resume": {},
        "set_theme": {"theme": "light"},
    }
    assert set(samples) == {t["name"] for t in CHAT_TOOLS}
    for name, sample in samples.items():
        assert normalize_tool_action(name, sample) is not None, name
