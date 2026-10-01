"""GET /api/logs (Supabase read, file fallback, error body) and telemetry
store failures. Supabase is faked at the telemetry_routes boundary."""
import uuid

import pytest

from backend.app.api import telemetry_routes


class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, data=None, error=None):
        self._data, self._error, self.filters = data, error, []

    def select(self, *_):
        return self

    def in_(self, col, vals):
        self.filters.append((col, vals))
        return self

    def order(self, *_a, **_k):
        return self

    def insert(self, _entry):
        return self

    def execute(self):
        if self._error:
            raise self._error
        return _Result(self._data)


class _Store:
    def __init__(self, query):
        self.query = query

    def get_admin_client(self):
        return self

    def table(self, _name):
        return self.query


@pytest.fixture
def open_access(monkeypatch):
    async def _ok(_request):
        return None

    monkeypatch.setattr(telemetry_routes, "verify_access", _ok)


def _use(monkeypatch, query):
    monkeypatch.setattr(telemetry_routes, "SupabaseClient", lambda: _Store(query))


def test_logs_require_auth_outside_dev(client):
    assert client.get("/api/logs").status_code == 401


def test_logs_returns_supabase_rows_and_filters_sessions(client, open_access, monkeypatch):
    q = _Query(data=[{"message": "a"}])
    _use(monkeypatch, q)
    r = client.get("/api/logs", params={"session_uuid": " one , two ,"})
    assert r.status_code == 200 and r.json()["logs"] == [{"message": "a"}]
    assert q.filters == [("session_uuid", ["one", "two"])]


def test_logs_fall_back_to_files_when_supabase_is_empty(client, open_access, monkeypatch, tmp_path):
    sid = str(uuid.uuid4())
    path = tmp_path / "s.log"
    path.write_text("[2026-01-01T00:00:00Z] hello\n\nno prefix line\n", encoding="utf-8")
    _use(monkeypatch, _Query(data=[]))
    monkeypatch.setattr(telemetry_routes, "get_log_file_path", lambda _sid: str(path))
    r = client.get("/api/logs", params={"session_uuid": sid})
    assert r.status_code == 200
    assert r.json()["logs"] == [
        {"timestamp": "2026-01-01T00:00:00Z", "message": "hello"},
        {"timestamp": "", "message": "no prefix line"},
    ]


def test_logs_without_session_and_no_rows_is_empty(client, open_access, monkeypatch):
    _use(monkeypatch, _Query(data=[]))
    assert client.get("/api/logs").json()["logs"] == []


def test_logs_error_body_hides_exception_text(client, open_access, monkeypatch):
    _use(monkeypatch, _Query(error=RuntimeError("db.internal.example password")))
    r = client.get("/api/logs")
    assert r.status_code == 500
    assert "internal" not in r.text and "password" not in r.text


def _telemetry_body():
    return {"sessionUUID": str(uuid.uuid4()), "timestamp": "2026-01-01T00:00:00Z"}


def test_telemetry_is_stored(client, monkeypatch):
    telemetry_routes._ingest_limiter.reset()
    _use(monkeypatch, _Query())
    assert client.post("/api/telemetry", json=_telemetry_body()).status_code == 200


def test_telemetry_store_failure_is_generic_500(client, monkeypatch):
    telemetry_routes._ingest_limiter.reset()
    _use(monkeypatch, _Query(error=RuntimeError("table telemetry col secret")))
    r = client.post("/api/telemetry", json=_telemetry_body())
    assert r.status_code == 500
    assert "secret" not in r.text and "table" not in r.text
