"""Hosted labs and forwards: validation, routes, documents, SPA registration, discovery."""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app import labs
from backend.app.api import content, discovery
from backend.app.api import labs_routes as routes
from backend.app.api.discovery_routes import router as discovery_router
from backend.app.labs import LabDataError, build_catalog
from backend.app.labs_document import render_lab_document
from backend.app.models import load_projects
from backend.app.models.labs import RESERVED_SLUGS, Forward, Lab
from backend.app.spa import SPAStaticFiles

HTML = {"accept": "text/html"}
PROJECT_KEYS = list(load_projects().root)
REPO_ROOT = Path(__file__).resolve().parents[2]
PHONE_LIKE = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}")

INDEX = (
    "<!doctype html><html><head><title>home</title>"
    '<meta name="description" content="home" />'
    '<link rel="canonical" href="https://www.jckail.com/" />'
    '<script type="application/ld+json">{}</script>'
    '</head><body><div id="root"></div></body></html>'
)


def lab_data(slug="demo", **over):
    data = {
        "slug": slug,
        "project_key": "ai_billing",
        "title": "Demo Lab",
        "description": "A short description of the demo.",
        "intro": ["First paragraph.", "Second paragraph."],
        "features": ["One", "Two", "Three"],
        "repo": "https://github.com/jckail/demo",
        "demo_notice": "All data is synthetic and runs entirely in your browser.",
        "updated": "2026-09-30",
    }
    data.update(over)
    return data


# --- Model validation ------------------------------------------------------------


@pytest.mark.parametrize("slug", ["ab", "1abc", "Abc", "a-bc", "a" * 32, "ab_c", "", "abc/"])
def test_bad_slug_shapes_are_rejected(slug):
    with pytest.raises(ValueError):
        Lab.model_validate(lab_data(slug=slug))


@pytest.mark.parametrize("slug", sorted(RESERVED_SLUGS))
def test_reserved_slugs_are_rejected(slug):
    # Reserved slugs that are also shorter than the regex fail either way; both are rejections.
    with pytest.raises(ValueError):
        Lab.model_validate(lab_data(slug=slug))
    with pytest.raises(ValueError):
        Forward.model_validate({"slug": slug, "target": "https://example.com/", "project_key": "pointup"})


def test_a_valid_lab_round_trips():
    assert Lab.model_validate(lab_data()).slug == "demo"


@pytest.mark.parametrize(
    "over",
    [
        {"title": "x" * 91},
        {"description": "x" * 301},
        {"intro": []},
        {"intro": ["a"] * 5},
        {"features": ["a", "b"]},
        {"features": ["a"] * 9},
        {"repo": "http://github.com/jckail/demo"},
        {"repo": "https://gitlab.com/jckail/demo"},
        {"repo": "https://github.com/jckail"},
        {"repo": "https://user:pw@github.com/jckail/demo"},
        {"demo_notice": "Runs in your browser."},
        {"demo_notice": "The data is synthetic."},
        {"updated": "2026-13-01"},
        {"updated": "30/09/2026"},
        {"title": " padded "},
        {"intro": ["bad\x00text"]},
        {"unexpected": "field"},
    ],
)
def test_invalid_lab_fields_are_rejected(over):
    with pytest.raises(ValueError):
        Lab.model_validate(lab_data(**over))


@pytest.mark.parametrize(
    "target",
    [
        "http://www.pointup.io/",
        "https://user:pw@www.pointup.io/",
        "https://www.pointup.io:8443/",
        "https://www.pointup.io:abc/",
        "//www.pointup.io/",
        "javascript:alert(1)",
        "https://",
        "https://www.pointup.io/ x",
        "https://www.pointup.io\\@evil.example/",
    ],
)
def test_forward_targets_must_be_clean_https(target):
    with pytest.raises(ValueError):
        Forward.model_validate({"slug": "pointup", "target": target, "project_key": "pointup"})


# --- Catalog loading -------------------------------------------------------------


def write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def test_catalog_requires_filename_to_equal_slug(tmp_path):
    write(tmp_path / "labs" / "other.json", lab_data("demo"))
    with pytest.raises(LabDataError, match="file name must equal slug"):
        build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)


def test_catalog_requires_a_known_project(tmp_path):
    write(tmp_path / "labs" / "demo.json", lab_data("demo", project_key="nope"))
    with pytest.raises(LabDataError, match="unknown project_key"):
        build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)


def test_catalog_rejects_unreadable_json_without_leaking_it(tmp_path):
    (tmp_path / "labs").mkdir()
    (tmp_path / "labs" / "demo.json").write_text("{not json", encoding="utf-8")
    with pytest.raises(LabDataError, match="cannot read JSON"):
        build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)


def test_forward_slug_may_not_collide_with_a_lab_or_another_forward(tmp_path):
    write(tmp_path / "labs" / "demo.json", lab_data("demo"))
    forward = {"slug": "demo", "target": "https://example.com/", "project_key": "pointup"}
    write(tmp_path / "forwards.json", [forward])
    with pytest.raises(LabDataError, match="duplicate slug"):
        build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)
    write(tmp_path / "forwards.json", [{**forward, "slug": "other"}, {**forward, "slug": "other"}])
    with pytest.raises(LabDataError, match="duplicate slug"):
        build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)


def test_forwards_must_be_a_list_with_known_projects(tmp_path):
    write(tmp_path / "forwards.json", {"slug": "x"})
    with pytest.raises(LabDataError, match="must be a list"):
        build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)
    write(tmp_path / "forwards.json", [{"slug": "pointup", "target": "https://example.com/", "project_key": "zzz"}])
    with pytest.raises(LabDataError, match="unknown project_key"):
        build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)


def test_catalog_is_empty_when_nothing_exists(tmp_path):
    catalog = build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)
    assert catalog.labs == {} and catalog.forwards == {}


def test_labs_follow_project_order(tmp_path):
    write(tmp_path / "labs" / "zed.json", lab_data("zed", project_key="jobbr"))
    write(tmp_path / "labs" / "abc.json", lab_data("abc", project_key="go_pilot"))
    write(tmp_path / "labs" / "mid.json", lab_data("mid", project_key="ai_billing"))
    catalog = build_catalog(tmp_path / "labs", tmp_path / "forwards.json", PROJECT_KEYS)
    assert list(catalog.labs) == ["mid", "zed", "abc"]


def test_real_data_is_valid_and_every_hosted_slug_has_a_frontend_folder():
    catalog = build_catalog(labs.LABS_DIR, labs.FORWARDS_FILE, PROJECT_KEYS)
    for slug in catalog.labs:
        assert (REPO_ROOT / "frontend" / "src" / "app" / "labs" / slug / "lab.tsx").is_file(), slug
    assert {"superteacher", "pointup"} <= set(catalog.forwards)
    for forward in catalog.forwards.values():
        assert forward.target.startswith("https://")


@pytest.mark.parametrize("path", sorted(labs.LABS_DIR.glob("*.json")), ids=lambda p: p.name)
def test_every_real_lab_file_is_valid(path):
    lab = Lab.model_validate_json(path.read_text(encoding="utf-8"))
    assert lab.slug == path.stem
    assert lab.project_key in PROJECT_KEYS
    assert not PHONE_LIKE.search(path.read_text(encoding="utf-8"))


# --- App fixture -----------------------------------------------------------------


def _clear():
    labs.clear_caches()
    routes.clear_caches()
    for builder in (discovery.llms_txt, discovery.llms_full_txt, discovery.sitemap_xml):
        builder.cache_clear()
    from backend.app.api.discovery_routes import _payload

    _payload.cache_clear()


@pytest.fixture()
def site(tmp_path, monkeypatch):
    write(tmp_path / "data" / "labs" / "demo.json", lab_data("demo", title="Demo <Lab> & \"co\""))
    write(
        tmp_path / "data" / "forwards.json",
        [{"slug": "pointup", "target": "https://www.pointup.io/", "project_key": "pointup"}],
    )
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text(INDEX)
    with monkeypatch.context() as patch:
        patch.setattr(labs, "LABS_DIR", tmp_path / "data" / "labs")
        patch.setattr(labs, "FORWARDS_FILE", tmp_path / "data" / "forwards.json")
        _clear()
        app = FastAPI()
        app.include_router(routes.router, prefix="/api")
        app.include_router(routes.build_forward_router(labs.load_forwards()))
        app.include_router(discovery_router)
        app.mount("/", SPAStaticFiles(directory=str(dist), html=True, bootstrap=content.bootstrap_json), name="spa")
        yield TestClient(app, follow_redirects=False)
    _clear()


# --- API -------------------------------------------------------------------------


def test_list_and_get_return_the_lab_with_validators(site):
    listing = site.get("/api/labs")
    assert listing.status_code == 200
    assert [item["slug"] for item in listing.json()] == ["demo"]
    one = site.get("/api/labs/demo")
    assert one.status_code == 200 and one.json()["repo"] == "https://github.com/jckail/demo"
    assert site.get("/api/labs/demo", headers={"if-none-match": one.headers["etag"]}).status_code == 304


@pytest.mark.parametrize("slug", ["nope", "pointup", "constructor", "__proto__", "DEMO"])
def test_unknown_lab_is_404(site, slug):
    assert site.get(f"/api/labs/{slug}").status_code == 404


# --- Forwards --------------------------------------------------------------------


@pytest.mark.parametrize("method", ["GET", "HEAD"])
@pytest.mark.parametrize("path", ["/pointup", "/pointup/"])
def test_forward_redirects_with_location_from_data(site, method, path):
    response = site.request(method, path, headers=HTML)
    assert response.status_code == 302
    assert response.headers["location"] == "https://www.pointup.io/"
    assert response.headers["x-robots-tag"] == "noindex"
    assert "max-age" in response.headers["cache-control"]


def test_forward_does_not_catch_other_paths(site):
    assert site.get("/pointup/extra", headers=HTML).status_code == 404
    assert site.post("/pointup").status_code == 405


def test_forward_is_not_in_sitemap_but_is_in_llms(site):
    sitemap = site.get("/sitemap.xml").text
    assert "pointup" not in sitemap
    llms = site.get("/llms.txt").text
    assert "## Interactive demos" in llms
    assert "(https://www.pointup.io/)" in llms
    assert "https://www.jckail.com/demo" in llms


# --- Documents and SPA registration ----------------------------------------------


@pytest.mark.parametrize("path", ["/demo", "/demo/"])
def test_hosted_lab_is_200_with_a_server_rendered_document(site, path):
    response = site.get(path, headers=HTML)
    assert response.status_code == 200
    body = response.text
    assert "<title>Demo &lt;Lab&gt; &amp; &quot;co&quot; | Jordan Kail</title>" in body
    assert '<link rel="canonical" href="https://www.jckail.com/demo" />' in body
    assert 'property="og:url" content="https://www.jckail.com/demo"' in body
    assert 'name="twitter:title"' in body
    assert "<h1>Demo &lt;Lab&gt; &amp; &quot;co&quot;</h1>" in body
    assert "First paragraph." in body and "<li>Two</li>" in body
    assert "synthetic" in body and 'href="https://github.com/jckail/demo"' in body
    assert body.count('tabindex="-1"') == 2
    assert response.headers["link"] == '<https://www.jckail.com/demo>; rel="canonical"'
    assert "x-robots-tag" not in response.headers
    assert not PHONE_LIKE.search(body)


def test_jsonld_parses_and_has_application_and_breadcrumbs(site):
    body = site.get("/demo", headers=HTML).text
    block = re.search(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', body, re.S).group(1)
    assert "<" not in block
    graph = json.loads(block)["@graph"]
    kinds = {node["@type"] for node in graph}
    assert kinds == {"WebApplication", "BreadcrumbList"}
    app = next(n for n in graph if n["@type"] == "WebApplication")
    assert app["url"] == "https://www.jckail.com/demo"
    assert app["name"] == 'Demo <Lab> & "co"'


def test_document_is_revalidatable_and_gzip(site):
    first = site.get("/demo", headers=HTML)
    again = site.get("/demo", headers={**HTML, "if-none-match": first.headers["etag"]})
    assert again.status_code == 304
    zipped = site.get("/demo", headers={**HTML, "accept-encoding": "gzip"})
    assert zipped.headers["content-encoding"] == "gzip"
    assert zipped.text == first.text


def test_unknown_slugs_stay_404_and_noindex(site):
    for path in ("/missing", "/demo/extra", "/pointup/extra"):
        response = site.get(path, headers=HTML)
        assert response.status_code == 404, path
        assert response.headers["x-robots-tag"] == "noindex"
        assert "<title>home</title>" in response.text


def test_each_lab_gets_its_own_document(site, tmp_path):
    other = tmp_path / "data" / "labs" / "second.json"
    write(other, lab_data("second", title="Second Lab"))
    _clear()
    assert "Second Lab | Jordan Kail" in site.get("/second", headers=HTML).text
    assert "Demo &lt;Lab&gt;" in site.get("/demo", headers=HTML).text


def test_render_lab_document_escapes_hostile_values():
    lab = Lab.model_validate(
        lab_data(
            title="</title><script>alert(1)</script>",
            intro=['<img src=x onerror=alert(1)> "quoted"'],
            features=["</script>", "b", "c"],
        )
    )
    out = render_lab_document(INDEX.encode(), lab).decode()
    assert "<script>alert" not in out
    assert "<img" not in out
    assert out.count("</script>") == 1  # only the JSON-LD block closes a script
    block = re.search(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', out, re.S).group(1)
    assert json.loads(block)["@graph"][0]["name"] == lab.title


# --- Sitemap and llms ------------------------------------------------------------


def test_sitemap_lists_hosted_labs_with_their_updated_date(site):
    root = ET.fromstring(site.get("/sitemap.xml").content)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    rows = {u.findtext("s:loc", namespaces=ns): u.findtext("s:lastmod", namespaces=ns) for u in root.findall("s:url", ns)}
    assert rows["https://www.jckail.com/demo"] == "2026-09-30"
    assert not any("pointup" in loc for loc in rows)


def test_llms_full_has_the_demo_section(site):
    text = site.get("/llms-full.txt").text
    assert "## Interactive demos" in text
    assert text.index("## Interactive demos") < text.index("## Skills")
    assert "https://www.jckail.com/demo" in text and "https://www.pointup.io/" in text


def test_the_real_app_forwards_before_the_spa_fallback(client):
    for slug, target in (("superteacher", "https://www.the-super-teacher.com/"), ("pointup", "https://www.pointup.io/")):
        for path in (f"/{slug}", f"/{slug}/"):
            response = client.get(path, headers=HTML, follow_redirects=False)
            assert response.status_code == 302
            assert response.headers["location"] == target
            assert response.headers["x-robots-tag"] == "noindex"
    assert client.get("/api/labs").json() == [lab.model_dump() for lab in labs.load_labs().values()]
