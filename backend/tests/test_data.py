"""Portfolio data integrity: models load and referenced files exist."""
import os

from backend.app.models import get_all_models

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def test_all_models_load():
    models = get_all_models()
    assert models, "expected portfolio data to load"


def test_portrait_image_exists():
    models = get_all_models()
    about = models["about_me"]
    portrait = about.full_portrait.lstrip("/")
    path = os.path.join(REPO_ROOT, "frontend", "public", portrait)
    assert os.path.isfile(path), f"referenced portrait missing: {portrait}"


def test_resume_file_exists():
    resume = os.environ["RESUME_FILE"]
    path = os.path.join(REPO_ROOT, "backend", "assets", resume)
    assert os.path.isfile(path), f"resume file missing: {resume}"


def test_zuni_subject_parameter_is_honoured(client):
    """The frontend sends ?subject=N; the route used to name it
    `subject_number` only, so every request silently returned a random image
    and party mode's three "distinct" layers could all draw the same one."""
    first = client.get("/api/zuni?subject=5")
    assert first.status_code == 200
    assert first.headers["content-type"] == "image/webp"

    # Same subject must be byte-identical across calls, not random.
    for _ in range(3):
        again = client.get("/api/zuni?subject=5")
        assert again.content == first.content

    # A different subject must actually differ.
    other = client.get("/api/zuni?subject=6")
    assert other.status_code == 200
    assert other.content != first.content


def test_zuni_unknown_subject_is_404(client):
    assert client.get("/api/zuni?subject=9999").status_code == 404


def test_resume_pdf_matches_the_current_role():
    """The PDF must not drift from experience.json.

    The previous resume was a third-party export updated by hand, so it
    advertised a stale employer for months while the only test here asserted
    the file existed. helpers/build_resume_pdf.py now emits a manifest beside
    the PDF describing what it says; this compares that to the source of
    truth. Regenerate the PDF when this fails - do not edit the manifest.
    """
    import json
    from pathlib import Path

    assets = Path(__file__).resolve().parent.parent / "assets"
    data = Path(__file__).resolve().parent.parent / "app" / "data"

    manifest = json.loads((assets / "JordanKailResume.meta.json").read_text())
    experience = json.loads((data / "experience.json").read_text())

    current_key = next(iter(experience))
    current = experience[current_key]

    assert manifest["current_company"] == current["company"]
    assert manifest["current_title"] == current["title"]
    assert manifest["current_dates"] == current["date"]
    assert current["date"].endswith("Present"), (
        "the first experience entry should be the current role"
    )
    assert (assets / manifest["pdf"]).is_file()
