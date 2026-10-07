"""Short-lived signed access receipts, issued only after owner notification.

Receipts contain no visitor email/company. They acknowledge a submission, not
ownership of the entered email or employment at the entered company.
"""
import base64
import hashlib
import hmac
import json
import secrets
import time

from backend.app.config import get_settings

ACCESS_TTL_SECONDS = 8 * 3600


def configured() -> bool:
    return len(get_settings().agent_access_secret) >= 32


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def issue_access() -> tuple[str, int]:
    if not configured():
        raise ValueError("Agent access is not configured")
    expires = int(time.time()) + ACCESS_TTL_SECONDS
    payload = _encode(json.dumps({"v": 1, "exp": expires, "id": secrets.token_urlsafe(24)},
                                 separators=(",", ":")).encode())
    signature = _encode(hmac.digest(get_settings().agent_access_secret.encode(), payload.encode(), hashlib.sha256))
    return f"{payload}.{signature}", expires


def verify_access(token: object) -> int | None:
    if not configured() or not isinstance(token, str) or not 1 <= len(token) <= 512:
        return None
    try:
        payload, signature = token.split(".")
        expected = _encode(hmac.digest(get_settings().agent_access_secret.encode(), payload.encode(), hashlib.sha256))
        if not hmac.compare_digest(signature, expected):
            return None
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        expires = claims.get("exp")
        if claims.get("v") != 1 or type(expires) is not int:
            return None
        now = int(time.time())
        return expires if now < expires <= now + ACCESS_TTL_SECONDS else None
    except (ValueError, TypeError, UnicodeError, AttributeError):
        return None
