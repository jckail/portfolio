"""Unit tests for chat tool-action normalization."""
from backend.app.services.chat_actions import normalize_tool_action


def test_navigate_section_accepts_known_targets():
    assert normalize_tool_action(
        "navigate_section", {"section": "experience"}
    ) == {"action": "navigate", "target": "experience"}


def test_navigate_section_rejects_unknown():
    assert normalize_tool_action("navigate_section", {"section": "admin"}) is None


def test_open_modal_requires_key_except_contact():
    assert normalize_tool_action("open_modal", {"kind": "skill"}) is None
    assert normalize_tool_action(
        "open_modal", {"kind": "skill", "key": "python"}
    ) == {"action": "open_modal", "kind": "skill", "key": "python"}
    assert normalize_tool_action("open_modal", {"kind": "contact"}) == {
        "action": "open_modal",
        "kind": "contact",
        "key": None,
    }


def test_download_resume():
    assert normalize_tool_action("download_resume", {}) == {
        "action": "download_resume"
    }


def test_unknown_tool_rejected():
    assert normalize_tool_action("rm_rf", {}) is None
