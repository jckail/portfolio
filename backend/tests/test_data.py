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


def test_skill_related_keys_resolve():
    """`related` links in the skill modal must point at real skills."""
    skills = get_all_models()["skills"].root
    for key, skill in skills.items():
        for rel in skill.related:
            assert rel in skills, f"{key} lists unknown related skill {rel}"
            assert rel != key


def test_experience_tech_stack_tags_name_known_skills():
    """Tags that should open a skill modal must match a skill display name."""
    models = get_all_models()
    names = {s.display_name.lower() for s in models["skills"].root.values()}
    experience = models["experience"].root
    for role in ("together_ai", "prove", "meta"):
        for tag in experience[role].tech_stack:
            assert tag.replace("-", " ").lower() in names, f"{role}: unknown skill tag {tag}"


def test_ai_work_leads_the_recent_roles():
    """The AI/agents bullets come first: older roles only show two bullets."""
    experience = get_all_models()["experience"].root
    assert "agents platform" in experience["together_ai"].highlights[1].lower()
    assert "govern" in experience["prove"].highlights[0].lower()
    assert "classifiers" in experience["meta"].highlights[0].lower()


def test_project_link_label_defaults_and_override():
    from backend.app.models import load_projects

    projects = load_projects()
    root = projects.root if hasattr(projects, "root") else projects
    assert root["qr_for_groups"].link_label == "Read coverage"
    assert root["jobbr"].link_label == "Open Jobbr"
    assert root["kefi"].link_label == "Open product"
    assert root["go_pilot"].link_label == "View project"


def test_project_secondary_links_and_labels():
    from backend.app.models import load_projects

    root = load_projects().root
    assert root["qr_for_groups"].link2_label == "Live demo"  # default
    for key, slug in {
        "ai_billing": "aibilling",
        "go_pilot": "gopilot",
        "lit_crypto": "cryptotrader",
    }.items():
        assert str(root[key].link2) == f"https://www.jckail.com/{slug}"
        assert root[key].link2_label == "Interactive demo"
    assert str(root["super_teacher"].link2) == "https://www.the-super-teacher.com/"
    assert str(root["pointup"].link2) == "https://www.pointup.io/"
    assert str(root["jobbr"].link2) == "https://jobdog.ai/jobbr/#/"
    assert root["jobbr"].link2_label == "Open app"
    assert root["super_teacher"].link2_label == "Earlier version"
    assert root["pointup"].link2_label == "Open app"


def test_pointup_describes_the_typescript_monorepo():
    from backend.app.models import load_projects

    pointup = load_projects().root["pointup"]
    assert "Selenium" not in pointup.tech_stack
    assert "Next.js" in pointup.tech_stack
    assert "legacy" in pointup.description_detail.lower()


def test_sabbatical_entry_needs_no_company_and_photos_exist():
    experience = get_all_models()["experience"].root
    role = experience["sabbatical"]
    assert role.link is None and role.logoPath is None and role.tech_stack == []
    assert role.date == "10/2022 - 05/2023"
    assert role.highlights == ['Made up for lost time during COVID-19 with a road trip through Seattle, Portland, San Francisco, Austin, New York, Washington, DC, Chicago, Los Angeles, and San Diego.', 'Spent 50 nights camping and hiking, and skied 100 days that season in Colorado and Utah.', 'Traveled through Europe, spent time with family members in need, and relocated back to Denver from California.']
    assert experience["meta"].location == "Menlo Park, CA"
    assert role.company_description == "Made up for lost time during COVID-19 by exploring the world, chasing outdoor adventures, and spending time with family."
    assert role.more_highlights == ["Made up for lost time during COVID-19 with a road trip through Seattle, Portland, San Francisco, Austin, New York, Washington, DC, Chicago, Los Angeles, and San Diego.", "Spent 50 nights camping and hiking, and skied 100 days that season in Colorado and Utah.", "Traveled through Europe, spent time with family members in need, and relocated back to Denver from California."]
    for key, item in experience.items():
        for photo in item.photos:
            path = os.path.join(REPO_ROOT, "frontend", "public", photo.src.lstrip("/"))
            assert os.path.isfile(path), f"{key}: photo missing: {photo.src}"
            assert photo.alt.strip()


def test_photo_src_must_be_a_site_image_path():
    import pytest
    from pydantic import ValidationError

    from backend.app.models.experience import ExperiencePhoto

    ExperiencePhoto(src="/images/sabbatical/a.webp", alt="x")
    for bad in ("https://evil.example/a.png", "/etc/passwd", "../a.png", "javascript:1"):
        with pytest.raises(ValidationError):
            ExperiencePhoto(src=bad, alt="x")


def test_project_titles_have_no_stray_whitespace():
    projects = get_all_models()["projects"].root
    for key, project in projects.items():
        assert project.title == project.title.strip(), f"{key} title has stray whitespace"
