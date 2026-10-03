"""The lab document never invents an absent project source URL."""
import pytest

from backend.app import dataplayground_document as document
from backend.app.models import load_projects
from backend.app.models.projects import Projects


@pytest.mark.parametrize("has_link", [True, False])
def test_lab_preserves_back_link_and_omits_unavailable_source(monkeypatch, has_link):
    project = load_projects().root["data_playground"]
    if not has_link:
        project = project.model_copy(update={"link": None})
    monkeypatch.setattr(document, "load_projects", lambda: Projects({"data_playground": project}))
    page = document.render_document(b'<html><head></head><body><div id="root"></div></body></html>').decode()
    assert project.title in page and project.description in page
    assert '<a href="/">Back to portfolio</a>' in page
    assert 'href="None"' not in page
    if has_link:
        assert f'href="{project.link}"' in page
        assert 'Source and reproduction instructions</a>' in page
    else:
        assert 'Source and reproduction instructions' not in page
