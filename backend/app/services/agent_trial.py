"""Signed anonymous trials backed by atomic, service-role-only database quotas.

The receipt identifies a trial; it never carries a mutable remaining count.
Supabase is authoritative across reconnects and Cloud Run instances.
"""
import asyncio
import base64
import hashlib
import hmac
import json
import time
from uuid import uuid4

from backend.app.config import get_settings
from backend.app.services.agent_access import configured
from backend.app.utils.supabase_client import supabase

TRIAL_TTL_SECONDS = 24 * 3600


class TrialUnavailable(Exception):
    """Quota storage is unavailable; do not fall back to local accounting."""


class TrialLimited(Exception):
    """The durable admission budget has been exhausted."""


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _sign(trial_id: str, expires: int) -> str:
    payload = _encode(json.dumps({"v": 2, "mode": "trial", "id": trial_id, "exp": expires},
                                 separators=(",", ":")).encode())
    signature = _encode(hmac.digest(get_settings().agent_access_secret.encode(), payload.encode(), hashlib.sha256))
    return f"{payload}.{signature}"


def verify_trial(token: object) -> tuple[str, int] | None:
    if not configured() or not isinstance(token, str) or not 1 <= len(token) <= 512:
        return None
    try:
        payload, signature = token.split(".")
        expected = _encode(hmac.digest(get_settings().agent_access_secret.encode(), payload.encode(), hashlib.sha256))
        if not hmac.compare_digest(signature, expected):
            return None
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        expires = claims.get("exp")
        trial_id = claims.get("id")
        if (claims.get("v") != 2 or claims.get("mode") != "trial" or type(expires) is not int
                or not isinstance(trial_id, str) or len(trial_id) != 36):
            return None
        return (trial_id, expires) if int(time.time()) < expires <= int(time.time()) + TRIAL_TTL_SECONDS else None
    except (ValueError, TypeError, UnicodeError, AttributeError):
        return None


async def _rpc(name: str, params: dict) -> dict:
    try:
        async with asyncio.timeout(8):
            result = await asyncio.to_thread(lambda: supabase.get_admin_client().rpc(name, params).execute())
        data = result.data
        if not isinstance(data, dict):
            raise TrialUnavailable
        return data
    except Exception:
        raise TrialUnavailable from None


async def issue_trial(ip: str) -> dict:
    if not configured():
        raise TrialUnavailable
    # Domain separation prevents reuse as a token MAC. No raw address is stored.
    peer_hash = hmac.new(get_settings().agent_access_secret.encode(),
                         f"portfolio-trial-peer:{ip}".encode(), hashlib.sha256).hexdigest()
    trial_id = str(uuid4())
    expires = int(time.time()) + TRIAL_TTL_SECONDS
    data = await _rpc("portfolio_issue_agent_trial", {"p_id": trial_id, "p_peer_hash": peer_hash,
                                                     "p_expires": expires})
    if data.get("allowed") is not True:
        raise TrialLimited
    return {"token": _sign(trial_id, expires), "expires": expires, "remaining_messages": 2}


async def trial_remaining(trial_id: str, *, consume: bool = False) -> int | None:
    data = await _rpc("portfolio_agent_trial_turn", {"p_id": trial_id, "p_consume": consume})
    remaining = data.get("remaining_messages")
    if data.get("valid") is not True or type(remaining) is not int or not 0 <= remaining <= 2:
        return None
    if consume and data.get("allowed") is not True:
        return None
    return remaining
