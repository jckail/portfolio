"""llms.txt, llms-full.txt, resume.json and sitemap.xml: generated from the JSON data."""
import re
import xml.etree.ElementTree as ET

import pytest

from backend.app.api import discovery
from backend.app.labs import load_labs
from backend.app.models import load_aboutme, load_contact, load_experience, load_projects, load_skills

# Anything shaped like a North American phone number.
PHONE_LIKE = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}")
ISO_DATE = re.compile(r"^([1-2][0-9]{3}-[0-1][0-9]-[0-3][0-9]|[1-2][0-9]{3}-[0-1][0-9]|[1-2][0-9]{3})$")


# --- Dates -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "text, start, end, current",
    [
        ("02/2025 - Present", "2025-02", None, True),
        ("01/2021 - 09/2022", "2021-01", "2022-09", False),
        ("9/2016 - 11/2017", "2016-09", "2017-11", False),
        ("nonsense", None, None, False),
        ("", None, None, False),
    ],
)
def test_parse_date_range(text, start, end, current):
    rng = discovery.parse_date_range(text)
    assert (rng.start, rng.end, rng.current) == (start, end, current)


def test_every_experience_date_parses():
    for job in load_experience().root.values():
        assert discovery.parse_date_range(job.date).start is not None, job.date


# --- Routes ----------------------------------------------------------------------


@pytest.mark.parametrize(
    "path, media",
    [
        ("/llms.txt", "text/plain"),
        ("/llms-full.txt", "text/plain"),
        ("/resume.json", "application/json"),
        ("/sitemap.xml", "application/xml"),
    ],
)
def test_documents_are_served_with_validators_and_cache_policy(client, path, media):
    response = client.get(path)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(media)
    assert response.headers["cache-control"].startswith("public, max-age=")
    assert response.headers["x-content-type-options"] == "nosniff"

    again = client.get(path, headers={"if-none-match": response.headers["etag"]})
    assert again.status_code == 304 and again.content == b""

    head = client.head(path)
    assert head.status_code == 200 and head.headers["etag"] == response.headers["etag"]


@pytest.mark.parametrize("path", ["/llms.txt", "/llms-full.txt", "/resume.json"])
def test_public_documents_allow_any_origin(client, path):
    assert client.get(path, headers={"origin": "https://example.org"}).headers["access-control-allow-origin"] == "*"


def test_documents_are_gzipped_when_asked(client):
    response = client.get("/llms-full.txt", headers={"accept-encoding": "gzip"})
    assert response.headers["content-encoding"] == "gzip"
    assert response.headers["vary"] == "Accept-Encoding"
    assert response.text.startswith("# Jordan Kail")


# --- llms.txt --------------------------------------------------------------------


def test_llms_txt_follows_the_convention(client):
    text = client.get("/llms.txt").text
    lines = text.splitlines()
    assert lines[0] == f"# {load_contact().firstName} {load_contact().lastName}"
    assert lines[2].startswith("> ")  # the summary blockquote
    assert "## Start here" in text and "## Optional" in text
    assert "(https://www.jckail.com/llms-full.txt)" in text
    assert "(https://www.jckail.com/resume.json)" in text
    for job in load_experience().root.values():
        assert (f"[{job.company}]" if job.link else f"- {job.company}:") in text
    for project in load_projects().root.values():
        assert f"[{project.title.strip()}]" in text
    # every link target is an absolute http(s) URL
    for target in re.findall(r"\]\(([^)]+)\)", text):
        assert target.startswith("https://"), target


def test_llms_full_txt_carries_the_whole_portfolio(client):
    text = client.get("/llms-full.txt").text
    for index, job in enumerate(load_experience().root.values()):
        assert f"### {job.title}, {job.company}" in text
        for bullet in discovery._visible_highlights(index, job):
            assert bullet in text
    for skill in load_skills().root.values():
        assert skill.display_name in text
    assert load_aboutme().description in text


@pytest.mark.parametrize("path", ["/llms.txt", "/llms-full.txt", "/resume.json", "/sitemap.xml"])
def test_documents_never_contain_a_phone_number(client, path):
    text = client.get(path).text
    assert not PHONE_LIKE.search(text)
    assert "tel:" not in text


def test_documents_do_not_leak_the_email_outside_resume_json(client):
    email = load_contact().email
    assert email not in client.get("/llms.txt").text
    assert email not in client.get("/llms-full.txt").text


# --- resume.json (JSON Resume 1.0.0) ---------------------------------------------

BASICS_KEYS = {"name", "label", "image", "email", "phone", "url", "summary", "location", "profiles"}
WORK_KEYS = {"name", "location", "description", "position", "url", "startDate", "endDate", "summary", "highlights"}


def test_resume_json_matches_the_json_resume_shape(client):
    response = client.get("/resume.json")
    doc = response.json()
    assert doc["$schema"].endswith("/schema.json")
    basics = doc["basics"]
    assert set(basics) <= BASICS_KEYS
    assert "phone" not in basics
    assert basics["name"] == "Jordan Kail"
    assert basics["url"] == "https://www.jckail.com/"
    assert {"city", "region", "countryCode"} <= set(basics["location"])
    assert {p["network"] for p in basics["profiles"]} == {"GitHub", "LinkedIn"}
    for profile in basics["profiles"]:
        assert profile["url"].startswith("https://") and profile["username"]

    jobs = load_experience().root
    assert [w["name"] for w in doc["work"]] == [j.company for j in jobs.values()]
    for item in doc["work"]:
        assert set(item) <= WORK_KEYS
        assert item["name"] and item["position"] and item["highlights"]
        assert ISO_DATE.match(item["startDate"])
        if "endDate" in item:
            assert ISO_DATE.match(item["endDate"])
        assert all(isinstance(h, str) and h for h in item["highlights"])
    current = doc["work"][0]
    assert current["name"] == "Together AI" and "endDate" not in current

    for project in doc["projects"]:
        assert project["name"] and project["url"].startswith("http")
        assert isinstance(project.get("keywords", []), list)

    assert doc["skills"] and all(s["name"] and s["keywords"] for s in doc["skills"])
    names = {k for s in doc["skills"] for k in s["keywords"]}
    assert names == {item for group in discovery._curated_skills() for item in group["items"]}
    assert set(doc) <= {"$schema", "basics", "work", "projects", "skills", "education", "meta"}


# --- sitemap.xml -----------------------------------------------------------------


def test_sitemap_lists_the_canonical_urls_with_lastmod(client):
    root = ET.fromstring(client.get("/sitemap.xml").content)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [u.findtext("s:loc", namespaces=ns) for u in root.findall("s:url", ns)]
    assert locs == [
        "https://www.jckail.com/",
        "https://www.jckail.com/dataplayground",
        *(f"https://www.jckail.com/{slug}" for slug in load_labs()),
    ]
    assert not any(loc.endswith((".txt", ".json")) or "/api/" in loc for loc in locs)
    for url in root.findall("s:url", ns):
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", url.findtext("s:lastmod", namespaces=ns))


# --- Resume PDF ------------------------------------------------------------------


def test_resume_pdf_revalidates_instead_of_refetching(client):
    response = client.get("/api/resume")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["content-disposition"].startswith("inline; filename=")
    assert response.headers["etag"] and response.headers["last-modified"]
    assert client.head("/api/resume").status_code == 200
    again = client.get("/api/resume", headers={"if-none-match": response.headers["etag"]})
    assert again.status_code == 304


# --- Snapshot focus behaviour ------------------------------------------------------


def test_snapshot_links_are_not_tabbable():
    """The snapshot is replaced by the app moments after load. A tabbable link in it
    would take an early Tab and then be removed, dropping focus before the skip link."""
    html = discovery.snapshot_html().decode()
    links = re.findall(r"<a\b[^>]*>", html)
    assert links, "expected the snapshot to contain links"
    assert all('tabindex="-1"' in tag for tag in links), [t for t in links if 'tabindex="-1"' not in t][:3]
    assert not re.search(r"<(button|input|select|textarea)\b", html)


def test_sabbatical_is_an_explained_gap_not_an_unknown_employer(client):
    jobs = list(load_experience().root)
    assert jobs.index("prove") + 1 == jobs.index("sabbatical") == jobs.index("meta") - 1
    job = load_experience().root["sabbatical"]
    assert job.link is None and job.logoPath is None and job.tech_stack == []

    work = {w["name"]: w for w in client.get("/resume.json").json()["work"]}
    item = work["Sabbatical"]
    assert item["position"] == "Digital nomad experiment"
    assert (item["startDate"], item["endDate"]) == ("2022-10", "2023-05")
    assert "url" not in item
    assert item["highlights"] == [
        "Made up for lost time during COVID-19 by road-tripping across the USA and Europe.",
        "Moved back to Colorado to tend to family.",
    ]

    html = discovery.snapshot_html().decode()
    assert "<h3>Digital nomad experiment, Sabbatical</h3>" in html
    assert "None" not in html.split('id="seo-experience"')[1].split("</section>")[0]
    full = client.get("/llms-full.txt").text
    assert "### Digital nomad experiment, Sabbatical" in full and "10/2022 - 05/2023 | Location independent\n" in full


def test_resume_json_preserves_approved_resume_edits(client):
    doc = client.get("/resume.json").json()
    assert doc["basics"]["location"] == {"city": "San Francisco", "region": "CA", "countryCode": "US"}
    assert doc["education"] == [{"institution": "University of Colorado Boulder", "area": "Computer Science",
                                 "startDate": "2011-08", "endDate": "2013-03"}]
    assert "studyType" not in doc["education"][0]  # no degree claimed
    assert doc["basics"]["summary"] == discovery._resume_data("aboutme")["resume_summary"]
    by_name = {entry["name"]: entry for entry in doc["work"]}
    assert by_name["Sabbatical"]["location"] == ""
    assert by_name["Together AI"]["highlights"] == discovery._resume_data("experience")["together_ai"]["resume_highlights"]
    assert "Java" not in {item for group in doc["skills"] for item in group["keywords"]}


def test_agents_can_discover_read_only_interfaces_without_javascript(client):
    for path in ("/llms.txt", "/llms-full.txt"):
        text = client.get(path).text
        for endpoint in ("/mcp", "/graphql", "/context.json"):
            assert discovery.absolute(endpoint) in text
        assert "read-only" in text
    html = discovery.snapshot_html().decode()
    for endpoint in ("/mcp", "/graphql", "/context.json"):
        assert f'href="{endpoint}"' in html
    assert "University of Colorado Boulder" in html
    assert "Computer Science" in client.get("/llms-full.txt").text
