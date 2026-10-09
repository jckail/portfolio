"""Public recruiter evidence and contact guidance, with no outbound calls."""
import json

import pytest

from backend.app.services.chat_tools import ALL_TOOLS, READ_TOOL_HANDLERS, run_read_tool


def test_recruiter_brief_is_curated_and_source_backed():
    brief = run_read_tool("get_recruiter_brief", {"focus": "agent harness"})
    assert brief["profile"]["location"] == "San Francisco, CA"
    assert brief["experience"][0]["title"] == "Staff Software Engineer, Agents Platform"
    assert len(brief["experience"]) == 3
    assert all(len(job["highlights"]) <= 2 for job in brief["experience"])
    assert brief["relevant_evidence"]
    assert brief["sources"]["pdf"].endswith("/api/resume")
    brief["profile"]["name"] = "changed"
    assert run_read_tool("get_recruiter_brief", {})["profile"]["name"] == "Jordan Kail"


def test_project_details_are_exact_key_and_include_source_links():
    project = run_read_tool("get_project_details", {"key": "go_pilot"})
    assert project["title"] == "goPilot"
    assert project["details"] and project["links"]
    assert "?project=go_pilot" in project["source_url"]
    assert "independent code audit" in project["note"]


@pytest.mark.parametrize("key", [None, [], "constructor", "__proto__", "unknown", "a" * 65])
def test_project_details_reject_non_public_keys(key):
    assert run_read_tool("get_project_details", {"key": key})["status"] == "not_found"


def test_role_matching_reports_evidence_and_unknowns_without_score():
    result = run_read_tool("match_role_requirements", {
        "requirements": ["Python agent harness", "zzznopublicevidencezzz"],
    })
    assert result["requirements"][0]["status"] == "evidence_to_review"
    assert result["requirements"][0]["evidence"]
    assert result["requirements"][1]["status"] == "not_published"
    assert result["requirements"][1]["evidence"] == []
    assert "not a fit score" in result["note"]
    assert "score" not in result


@pytest.mark.parametrize("requirements", [None, "Python", [], ["x"] * 9, [""], [None], ["x" * 201]])
def test_role_requirements_are_bounded(requirements):
    assert run_read_tool("match_role_requirements", {"requirements": requirements})["status"] == "invalid_arguments"


def test_contact_guidance_has_no_private_contact_data_or_booking_claim():
    result = run_read_tool("get_contact_options", {})
    assert "confirmation card" in result["email"]
    assert "does not book" in result["meeting"]
    assert "Confirm succeeds" in result["message"]
    assert "linkedin.com" in result["linkedin"]
    encoded = json.dumps(result)
    assert "@" not in encoded
    assert "phone" not in encoded
    assert "service_role" not in encoded


def test_read_dispatch_is_an_explicit_allowlist():
    assert run_read_tool("run_code", {})["status"] == "rejected"
    assert run_read_tool("contact_jordan", {})["status"] == "rejected"
    registry = {tool["name"] for tool in ALL_TOOLS}
    assert set(READ_TOOL_HANDLERS) <= registry
    assert run_read_tool("get_recruiter_brief", None)["profile"]["name"] == "Jordan Kail"
