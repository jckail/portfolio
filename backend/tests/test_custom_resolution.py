"""XSS/path-injection guards on the /api/custom_resolution preview page."""


def test_default_render(client):
    response = client.get("/api/custom_resolution")
    assert response.status_code == 200
    assert "375x800" in response.text


def test_known_device_name(client):
    response = client.get(
        "/api/custom_resolution", params={"device_name": "iphone 14"}
    )
    assert response.status_code == 200
    assert "390x844" in response.text


def test_unknown_device_name_is_404(client):
    response = client.get(
        "/api/custom_resolution", params={"device_name": "nokia 3310"}
    )
    assert response.status_code == 404


def test_valid_additional_path(client):
    response = client.get(
        "/api/custom_resolution", params={"additional_path": "projects?tab=1"}
    )
    assert response.status_code == 200
    assert 'src="/projects?tab=1"' in response.text


def test_script_injection_is_rejected(client):
    response = client.get(
        "/api/custom_resolution",
        params={"additional_path": '"><script>alert(1)</script>'},
    )
    assert response.status_code == 400


def test_protocol_relative_url_is_rejected(client):
    response = client.get(
        "/api/custom_resolution", params={"additional_path": "//evil.example.com"}
    )
    assert response.status_code == 400


def test_device_name_is_escaped(client):
    # device_name resolves against a fixed dict, so an XSS payload 404s;
    # what matters is it is never reflected unescaped.
    response = client.get(
        "/api/custom_resolution", params={"device_name": "<script>x</script>"}
    )
    assert response.status_code == 404
    assert "<script>x</script>" not in response.text
