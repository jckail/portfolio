"""Pre-rendered content responses: byte-identical bodies, ETags, 304s, gzip."""
import gzip

import pytest
from pydantic import TypeAdapter

from backend.app.api import content
from backend.app.models import (
    ExperienceHighlight,
    ProjectDetail,
    SkillDetail,
    load_aboutme,
    load_contact,
    load_experience,
    load_projects,
    load_skills,
)

COLLECTIONS = {
    "/api/aboutme": load_aboutme,
    "/api/contact/info": load_contact,
    "/api/experience": load_experience,
    "/api/projects": load_projects,
    "/api/skills": load_skills,
}
ITEMS = {
    "/api/experience": (load_experience, ExperienceHighlight),
    "/api/projects": (load_projects, ProjectDetail),
    "/api/skills": (load_skills, SkillDetail),
}
IDENTITY = {"accept-encoding": "identity"}


@pytest.mark.parametrize("path", sorted(COLLECTIONS))
def test_collection_body_matches_the_model(client, path):
    response = client.get(path, headers=IDENTITY)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    assert response.json() == COLLECTIONS[path]().model_dump(mode="json")
    assert "content-encoding" not in response.headers


@pytest.mark.parametrize("path", sorted(ITEMS))
def test_every_item_matches_its_response_model(client, path):
    loader, model = ITEMS[path]
    adapter = TypeAdapter(model)
    for key, item in loader().root.items():
        response = client.get(f"{path}/{key}", headers=IDENTITY)
        assert response.status_code == 200, key
        assert response.json() == adapter.dump_python(item, mode="json"), key


def test_item_lookup_is_case_insensitive(client):
    key = next(iter(load_skills().root))
    assert client.get(f"/api/skills/{key.upper()}").json() == client.get(f"/api/skills/{key}").json()


@pytest.mark.parametrize("key", ["constructor", "__proto__", "toString", "hasOwnProperty"])
@pytest.mark.parametrize("path", sorted(ITEMS))
def test_prototype_keys_are_plain_404s(client, path, key):
    response = client.get(f"{path}/{key}")
    assert response.status_code == 404
    assert "etag" not in response.headers


def test_responses_carry_a_strong_etag(client):
    response = client.get("/api/aboutme", headers=IDENTITY)
    etag = response.headers["etag"]
    assert etag.startswith('"') and etag.endswith('"') and not etag.startswith("W/")
    # Stable across requests (and, being a content hash, across instances).
    assert client.get("/api/aboutme", headers=IDENTITY).headers["etag"] == etag


@pytest.mark.parametrize("path", sorted(COLLECTIONS))
def test_matching_if_none_match_is_a_304(client, path):
    etag = client.get(path, headers=IDENTITY).headers["etag"]
    for header in (etag, f"W/{etag}", f'"other", {etag}', "*"):
        response = client.get(path, headers={**IDENTITY, "if-none-match": header})
        assert response.status_code == 304, header
        assert response.content == b""
        assert response.headers["etag"] == etag
        # A 304 refreshes the stored entry, so it repeats the 200's policy.
        assert "max-age=60" in response.headers["cache-control"]


def test_stale_if_none_match_gets_the_full_body(client):
    response = client.get("/api/skills", headers={"if-none-match": '"stale"'})
    assert response.status_code == 200
    assert response.json() == load_skills().model_dump(mode="json")


def test_large_payloads_are_served_pre_gzipped(client):
    plain = client.get("/api/skills", headers=IDENTITY)
    encoded = client.get("/api/skills", headers={"accept-encoding": "gzip"})

    assert encoded.headers["content-encoding"] == "gzip"
    assert "accept-encoding" in encoded.headers["vary"].lower()
    # Fixed bytes, so a real Content-Length rather than chunked streaming.
    assert int(encoded.headers["content-length"]) < len(plain.content)
    assert encoded.content == plain.content  # httpx decodes transparently
    # A different representation gets a different strong validator...
    assert encoded.headers["etag"] != plain.headers["etag"]
    # ...and either one revalidates.
    for etag in (plain.headers["etag"], encoded.headers["etag"]):
        revalidated = client.get(
            "/api/skills", headers={"accept-encoding": "gzip", "if-none-match": etag}
        )
        assert revalidated.status_code == 304


def test_small_payloads_are_not_compressed(client):
    response = client.get("/api/contact/info", headers={"accept-encoding": "gzip"})
    assert "content-encoding" not in response.headers
    assert "vary" not in response.headers


def test_build_payload_is_deterministic_and_round_trips():
    data = {"name": "Jordan", "items": ["x" * 2000], "emoji": "\N{WAVING HAND SIGN}"}
    first, second = content.build_payload(data), content.build_payload(data)
    assert first == second
    # Same rendering as JSONResponse: compact separators, raw UTF-8.
    assert first.body.startswith(b'{"name":"Jordan"')
    assert "\N{WAVING HAND SIGN}".encode() in first.body
    assert gzip.decompress(first.gzip_body) == first.body


def test_unknown_collection_is_a_programming_error():
    with pytest.raises(TypeError):
        content.item_payloads("aboutme")
