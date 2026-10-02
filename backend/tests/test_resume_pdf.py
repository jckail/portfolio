"""The downloadable resume must say what the site data says, for every role.

`helpers/build_resume_pdf.py` derives the PDF, the plain-text copy and a
manifest from `backend/app/data/*.json`. These tests fail when the data
changes and the artefacts were not regenerated:

    uv run --no-project --with reportlab --with pypdf python helpers/build_resume_pdf.py

Never hand-edit the PDF, the .txt or the manifest.
"""
import hashlib
import importlib.util
import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "backend" / "assets"

_spec = importlib.util.spec_from_file_location("build_resume_pdf", ROOT / "helpers" / "build_resume_pdf.py")
builder = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(builder)


def _squash(text: str) -> str:
    return re.sub(r"\s+", "", text)


@pytest.fixture(scope="module")
def content():
    return builder.load_content()


@pytest.fixture(scope="module")
def manifest():
    return json.loads((ASSETS / "JordanKailResume.meta.json").read_text(encoding="utf-8"))


def test_every_role_bullet_comes_from_experience_json(content):
    experience = json.loads((ROOT / "backend/app/data/experience.json").read_text(encoding="utf-8"))
    assert [r["key"] for r in content["roles"]] == list(experience)
    for role in content["roles"]:
        assert role["bullets"] == experience[role["key"]]["highlights"]


def test_manifest_covers_every_role_and_bullet(content, manifest):
    assert [r["company"] for r in manifest["roles"]] == [r["raw_company"] for r in content["roles"]]
    for listed, role in zip(manifest["roles"], content["roles"], strict=True):
        assert listed["bullets"] == role["bullets"], f"{role['company']}: regenerate the resume"
    assert manifest["sections"] == ["Summary", "Experience", "Skills", "Projects"]


def test_plain_text_copy_matches_the_data():
    text = (ASSETS / "JordanKailResume.txt").read_text(encoding="utf-8")
    assert text == builder.resume_text(), "JordanKailResume.txt is stale: regenerate the resume"


def test_manifest_hash_matches_the_text(manifest):
    text = (ASSETS / "JordanKailResume.txt").read_text(encoding="utf-8")
    assert manifest["text_sha256"] == hashlib.sha256(text.encode("utf-8")).hexdigest()


def test_text_is_ats_shaped(content):
    text = builder.resume_text(content)
    headings = [h for h in ("SUMMARY", "EXPERIENCE", "SKILLS", "PROJECTS") if f"\n{h}\n" in text]
    assert headings == ["SUMMARY", "EXPERIENCE", "SKILLS", "PROJECTS"]
    assert text.index("SUMMARY") < text.index("EXPERIENCE") < text.index("SKILLS") < text.index("PROJECTS")
    assert content["email"] in text
    assert not re.search(r"\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}", text), "the phone number must not be in the resume"
    for role in content["roles"]:
        assert re.fullmatch(r"\d\d/\d{4} – (\d\d/\d{4}|Present)", role["dates"])
    # current role first
    assert content["roles"][0]["dates"].endswith("Present")


def test_pdf_contains_every_bullet_and_is_two_pages_at_most(content):
    pypdf = pytest.importorskip("pypdf")
    reader = pypdf.PdfReader(str(ASSETS / "JordanKailResume.pdf"))
    assert len(reader.pages) <= 2
    page = reader.pages[0]
    assert (float(page.mediabox.width), float(page.mediabox.height)) == (612.0, 792.0), "US Letter"
    text = _squash("".join(p.extract_text() or "" for p in reader.pages))
    for role in content["roles"]:
        for bullet in role["bullets"]:
            assert _squash(bullet) in text, f"{role['company']}: bullet missing from the PDF, regenerate"
    assert "jckail13@gmail.com" in text
    assert reader.metadata.title == "Jordan Kail — Resume"


def test_career_break_is_labelled_for_ats_parsers(content):
    role = next(r for r in content["roles"] if r["key"] == "sabbatical")
    assert role["title"] == "Career break (digital nomad)"
    assert role["dates"] == "10/2022 – 05/2023"
    text = builder.resume_text(content)
    assert "Sabbatical — Career break (digital nomad) — Location independent" in text
