"""Placeholders must never reach a published surface.

Metric templates (``{{TOKEN}}``) live in private notes until real figures are
filled in. If one slips into the data, prompt, HTML, public files, the resume
text or the PDF, the site would ship a broken-looking claim to recruiters and
parsers, so this fails the build.
"""
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]

PLACEHOLDER = re.compile(r"\{\{[^}]*\}\}|\[\[[^\]]*\]\]|\bTODO\b|\bTBD\b|\bFIXME\b|lorem ipsum|<placeholder", re.I)

TEXT_SURFACES = [
    *sorted((ROOT / "backend/app/data").glob("*.json")),
    *sorted((ROOT / "backend/app/prompts").glob("*.md")),
    ROOT / "backend/assets/JordanKailResume.txt",
    ROOT / "backend/assets/JordanKailResume.meta.json",
    ROOT / "frontend/index.html",
    *[
        p
        for p in sorted((ROOT / "frontend/public").glob("*"))
        if p.suffix in {".txt", ".xml", ".json", ".webmanifest", ".md", ".html"}
    ],
]


@pytest.mark.parametrize("path", [p for p in TEXT_SURFACES if p.exists()], ids=lambda p: str(p.relative_to(ROOT)))
def test_no_placeholders_in_published_text(path):
    hit = PLACEHOLDER.search(path.read_text(encoding="utf-8", errors="replace"))
    assert hit is None, f"{path.relative_to(ROOT)} contains a placeholder: {hit.group(0)!r}"


def test_no_placeholders_in_the_resume_pdf():
    pypdf = pytest.importorskip("pypdf")
    pdf = ROOT / "backend/assets/JordanKailResume.pdf"
    text = "\n".join(page.extract_text() or "" for page in pypdf.PdfReader(str(pdf)).pages)
    hit = PLACEHOLDER.search(text)
    assert hit is None, f"resume PDF contains a placeholder: {hit.group(0)!r}"


@pytest.mark.parametrize("route", ["/llms.txt", "/llms-full.txt", "/resume.json", "/api/experience", "/api/skills", "/api/aboutme"])
def test_no_placeholders_in_served_content(route):
    from fastapi.testclient import TestClient

    from backend.app.main import app

    response = TestClient(app).get(route)
    if response.status_code == 404:
        pytest.skip(f"{route} not served in this build")
    assert response.status_code == 200
    hit = PLACEHOLDER.search(response.text)
    assert hit is None, f"{route} serves a placeholder: {hit.group(0)!r}"
