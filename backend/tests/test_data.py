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
