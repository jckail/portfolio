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
