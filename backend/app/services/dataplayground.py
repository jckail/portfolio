"""Read a verified demo artifact and adapt a fixed, optional simulation service."""
import asyncio
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

import httpx

from ..models.dataplayground import LabCatalog, SimulationRequest, SimulationRun

CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "dataplayground.json"
MAX_RESPONSE_BYTES = 2 * 1024 * 1024


class SimulationUnavailable(Exception):
    """The upstream is unavailable or returned an invalid public contract."""


def service_endpoint(base_url: str) -> str | None:
    """Only configuration controls the destination, never a request parameter."""
    try:
        url = urlsplit(base_url)
        if url.username or url.password or url.query or url.fragment or not url.hostname:
            return None
        if url.scheme != "https" and not (
            url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1", "::1"}
        ):
            return None
        if url.path not in {"", "/"}:
            return None
        _ = url.port  # Invalid configured ports must disable the feature too.
    except ValueError:
        return None
    return base_url.rstrip("/") + "/api/simulate"


@lru_cache(maxsize=1)
def load_catalog() -> LabCatalog:
    """Validated on first use; callers execute this file read in a worker thread."""
    return LabCatalog.model_validate_json(CATALOG_PATH.read_bytes())


async def simulate(endpoint: str, config: SimulationRequest) -> SimulationRun:
    try:
        # A wall-clock ceiling also bounds a peer slowly streaming many chunks.
        async with asyncio.timeout(20), httpx.AsyncClient(
            timeout=httpx.Timeout(15, connect=3), follow_redirects=False, trust_env=False,
        ) as client:
            async with client.stream("POST", endpoint, json=config.model_dump()) as response:
                if response.status_code != 200:
                    raise SimulationUnavailable
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > MAX_RESPONSE_BYTES:
                        raise SimulationUnavailable
                run = SimulationRun.model_validate_json(bytes(body))
                if run.config != config:
                    raise SimulationUnavailable
                return run
    except (httpx.HTTPError, ValueError, TimeoutError) as exc:
        raise SimulationUnavailable from exc
