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
        assert role["bullets"] == experience[role["key"]].get("resume_highlights", experience[role["key"]]["highlights"])


def test_manifest_covers_every_role_and_bullet(content, manifest):
    assert [r["company"] for r in manifest["roles"]] == [r["raw_company"] for r in content["roles"]]
    for listed, role in zip(manifest["roles"], content["roles"], strict=True):
        assert listed["bullets"] == role["bullets"], f"{role['company']}: regenerate the resume"
    assert manifest["sections"] == ["Summary", "Experience", "Education", "Skills", "Projects"]


def test_plain_text_copy_matches_the_data():
    text = (ASSETS / "JordanKailResume.txt").read_text(encoding="utf-8")
    assert text == builder.resume_text(), "JordanKailResume.txt is stale: regenerate the resume"


def test_manifest_hash_matches_the_text(manifest):
    text = (ASSETS / "JordanKailResume.txt").read_text(encoding="utf-8")
    assert manifest["text_sha256"] == hashlib.sha256(text.encode("utf-8")).hexdigest()


def test_text_is_ats_shaped(content):
    text = builder.resume_text(content)
    headings = [h for h in ("SUMMARY", "EXPERIENCE", "EDUCATION", "SKILLS", "PROJECTS") if f"\n{h}\n" in text]
    assert headings == ["SUMMARY", "EXPERIENCE", "EDUCATION", "SKILLS", "PROJECTS"]
    assert text.index("SUMMARY") < text.index("EXPERIENCE") < text.index("EDUCATION") < text.index("SKILLS") < text.index("PROJECTS")
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
    assert _squash(content["summary"]) in text
    for project in content["projects"]:
        assert _squash(project["description"]) in text, f"{project['title']}: project missing from the PDF"
    assert "jckail13@gmail.com" in text
    assert reader.metadata.title == "Jordan Kail — Resume"


def test_pdf_uses_concise_sabbatical_without_adventure_details(content):
    role = next(r for r in content["roles"] if r["key"] == "sabbatical")
    assert role["title"] == "Digital nomad experiment"
    assert role["location"] == ""
    assert role["dates"] == "10/2022 – 05/2023"
    assert role["bullets"] == ["Made up for lost time during COVID-19 by road-tripping across the USA and Europe.", "Moved back to Colorado to tend to family."]
    text = builder.resume_text(content)
    for omitted in ["Career break", "Location independent", "50 nights", "100 days", "Seattle", "San Diego"]:
        assert omitted not in text
    experience = json.loads((ROOT / "backend/app/data/experience.json").read_text())
    assert "50 nights" in " ".join(experience["sabbatical"]["highlights"])
    assert "100 days" in " ".join(experience["sabbatical"]["more_highlights"])


def test_updated_role_titles_and_education_appear_in_pdf(content, manifest):
    roles = {role["key"]: role for role in content["roles"]}
    assert roles["meta"]["location"] == "Menlo Park, CA"
    assert roles["quarg"]["title"] == "Staff Software Engineer, Agents Platform"
    assert roles["quarg"]["bullets"][0].startswith("Created the Agents Platform team;")
    assert roles["prove"]["title"] == "Staff Software Engineer"
    expected = [{"institution": "University of Colorado Boulder", "study": "Computer Science", "date": "08/2011 - 03/2013"}]
    assert content["education"] == manifest["education"] == expected
    assert expected == json.loads((ROOT / "backend/app/data/education.json").read_text())["entries"]
    pypdf = pytest.importorskip("pypdf")
    pdf_text = " ".join(page.extract_text() or "" for page in pypdf.PdfReader(str(ASSETS / "JordanKailResume.pdf")).pages)
    assert "University of Colorado Boulder" in pdf_text
    assert "Computer Science" in pdf_text
    assert "08/2011 – 03/2013" in pdf_text
    assert "Bachelor" not in pdf_text


def test_curated_skills_and_current_location_match_the_target_profile(content):
    source = json.loads((ROOT / "backend/app/data/resume_skills.json").read_text())["groups"]
    assert content["skills"] == [(g["label"], g["items"]) for g in source]
    labels = [label for label, _ in content["skills"]]
    assert labels[:2] == ["AI & Agent Engineering", "Software Engineering"]
    all_skills = [item for _, items in content["skills"] for item in items]
    for skill in ["Python", "SQL", "Go", "Rust", "Kubernetes", "Claude Code", "Codex", "Cursor", "Pi", "LangChain", "Graphify", "Knowledge graphs", "Neo4j"]:
        assert skill in all_skills
    assert "Java" not in all_skills and "Scala" not in all_skills
    assert len(all_skills) == len(set(all_skills))
    assert content["location"] == "San Francisco, CA"
    meta = next(role for role in content["roles"] if role["key"] == "meta")
    assert any("early precursor to the Llama project" in b for b in meta["bullets"])
    pypdf = pytest.importorskip("pypdf")
    text = " ".join(page.extract_text() or "" for page in pypdf.PdfReader(str(ASSETS / "JordanKailResume.pdf")).pages)
    assert "Studied" not in text
    for skill in ["Graphify", "Claude Code", "Pi", "Rust", "Knowledge graphs"]:
        assert skill in text


def test_pdf_links_include_the_visible_canonical_website(content):
    pypdf = pytest.importorskip("pypdf")
    reader = pypdf.PdfReader(str(ASSETS / "JordanKailResume.pdf"))
    text = " ".join(page.extract_text() or "" for page in reader.pages)
    assert "https://www.jckail.com" in text
    assert "jordan-kail.com" not in text
    uris = []
    for page in reader.pages:
        for reference in page.get("/Annots", []):
            annotation = reference.get_object()
            if annotation.get("/Subtype") == "/Link":
                action = annotation.get("/A", {})
                assert action.get("/S") == "/URI"
                uris.append(action["/URI"])
                left, bottom, right, top = map(float, annotation["/Rect"])
                assert 0 <= left < right <= 612
                assert 0 <= bottom < top <= 792
    expected = [f"mailto:{content['email']}"] + [url for _, url in content["links"]]
    expected += [url for project in content["projects"] for url in project["urls"]]
    assert all(url in uris for url in expected)
    assert "https://www.jckail.com" in uris


def test_pdf_has_unicode_embedded_text_and_logical_reading_order(content):
    pypdf = pytest.importorskip("pypdf")
    reader = pypdf.PdfReader(str(ASSETS / "JordanKailResume.pdf"))
    assert reader.trailer["/Root"]["/Lang"] == "en-US"
    assert not reader.is_encrypted
    ordered = [content["name"], content["headline"], "Summary", content["summary"], "Experience"]
    for role in content["roles"]:
        ordered += [builder.role_heading(role), role["dates"], *role["bullets"]]
    ordered += ["Education"]
    for entry in content["education"]:
        ordered += [entry["institution"], entry["study"], builder.pretty_dates(entry["date"])]
    ordered += ["Skills"]
    for label, items in content["skills"]:
        ordered += [label, *items]
    ordered += ["Projects"]
    for project in content["projects"]:
        ordered += [project["title"], project["description"]]
    # Test both content-stream order and geometric layout extraction.
    for mode in ("plain", "layout"):
        text = _squash("\n".join(page.extract_text(extraction_mode=mode) or "" for page in reader.pages))
        cursor = 0
        for fragment in ordered:
            index = text.find(_squash(fragment), cursor)
            assert index >= 0, f"{mode}: missing or out-of-order content: {fragment}"
            cursor = index + len(_squash(fragment))
        assert "\ufffd" not in text
    for page in reader.pages:
        resources = page["/Resources"]
        assert not resources.get("/XObject"), "resume must contain selectable text, not image scans"
        for reference in resources["/Font"].values():
            font = reference.get_object()
            assert font["/Subtype"] == "/TrueType"
            assert font.get("/ToUnicode"), "embedded fonts need Unicode maps for scanners"
            assert font["/FontDescriptor"].get_object().get("/FontFile2")
