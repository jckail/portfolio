"""In-process sliding-window rate limiting for unauthenticated endpoints.

The app runs as a small number of Cloud Run instances with no shared cache, so
limits are per-instance rather than global-to-the-service. That is deliberate:
the goal is to make abuse expensive and bounded, not to enforce an exact quota.

Two ceilings are applied together on purpose:

* a **per-client** limit, keyed on the caller's IP, which stops one visitor
  from monopolising a paid backend (Anthropic, SendGrid); and
* a **global** limit for the whole instance, which still holds when the
  per-client key is unreliable.

The global ceiling matters because behind Cloud Run the peer address is
Google's front end, not the visitor, so the real client IP has to come from
``X-Forwarded-For``. That header is only as trustworthy as the hop it is read
from (see ``client_ip``), and a misconfigured ``TRUSTED_PROXY_HOPS`` would
hand every caller their own bucket. The global limit is the backstop that
holds regardless, so it must be sized against the real budget rather than
left to a multiple of the per-client value.

Whether the header is read at all is decided in ``config`` (on by default on
Cloud Run, off elsewhere, overridable with ``TRUST_FORWARDED_FOR``).
"""
from __future__ import annotations

import logging
import time
from collections import deque
from collections.abc import Mapping

from fastapi import HTTPException

from backend.app.config import get_settings

from .events import log_event

logger = logging.getLogger(__name__)
_trust_mode_logged = False

# Entries idle for longer than this are dropped during pruning so the key space
# cannot grow without bound when every caller presents a distinct address.
_IDLE_EVICT_SECONDS = 900


def _log_trust_mode_once(trusted: bool, hops: int) -> None:
    global _trust_mode_logged
    if _trust_mode_logged:
        return
    _trust_mode_logged = True
    if trusted:
        logger.info("Rate-limit keys use X-Forwarded-For (trusted proxy hops: %d)", hops)
    else:
        logger.info("Rate-limit keys use the socket peer; X-Forwarded-For is ignored")


def client_ip(request_or_ws) -> str:
    """Best-effort client address for rate-limit bucketing.

    Reads ``X-Forwarded-For`` from the RIGHT, not the left. The header is a
    list that each hop appends to, so the leftmost entry is whatever the
    caller sent us — fully attacker-controlled — while the rightmost entries
    were appended by infrastructure we trust. Taking the leftmost value made
    every per-IP ceiling in this app selectable by the client: rotate the
    header, get a fresh bucket, and the limit is gone.

    ``TRUSTED_PROXY_HOPS`` selects how far in from the right to read, for
    deployments with more than one trusted proxy in front of the app. The
    default of 0 (the last entry) is the conservative choice: it can only ever
    over-group callers behind a shared proxy, never under-group an attacker.

    The header is ignored entirely unless forwarded-for trust is on (see
    ``config._forwarded_for_trust``). Without a proxy that appends to it, even
    the rightmost entry is the caller's own text, so reading it would let a
    direct client mint a fresh bucket per request; the socket peer is used
    instead.

    This value is advisory: it is a bucketing key, never an authorization
    signal, and the global ceiling in SlidingWindowLimiter is what holds if
    this is wrong.
    """
    settings = get_settings()
    _log_trust_mode_once(settings.trust_forwarded_for, settings.trusted_proxy_hops)
    forwarded = (
        request_or_ws.headers.get("x-forwarded-for")
        if settings.trust_forwarded_for else None
    )
    if forwarded:
        hops = [h.strip() for h in forwarded.split(",") if h.strip()]
        if hops:
            index = max(0, len(hops) - 1 - settings.trusted_proxy_hops)
            # Bound the key so a long header cannot inflate the key space.
            return hops[index][:64]
    client = getattr(request_or_ws, "client", None)
    return getattr(client, "host", None) or "unknown"


class SlidingWindowLimiter:
    """Fixed-capacity sliding window over a rolling time period."""

    def __init__(
        self,
        max_events: int,
        window_seconds: float,
        global_max_events: int | None = None,
        name: str = "unnamed",
    ):
        # Labels the rate_limit.blocked event; a short fixed identifier, never input.
        self.name = name
        self.max_events = max_events
        self.window_seconds = window_seconds
        # Defaults to a generous multiple of the per-client allowance.
        self.global_max_events = global_max_events if global_max_events is not None else max_events * 20
        self._buckets: dict[str, deque[float]] = {}
        self._global: deque[float] = deque()
        self._last_prune = 0.0

    def _prune(self, now: float) -> None:
        if now - self._last_prune < 60:
            return
        self._last_prune = now
        # Never evict a bucket whose events are still inside its own window:
        # a fixed 900s cutoff silently reset the 1-hour contact-form limit
        # every 15 minutes, quadrupling the real allowance.
        idle_cutoff = max(self.window_seconds, _IDLE_EVICT_SECONDS)
        stale = [
            key for key, times in self._buckets.items()
            if not times or now - times[-1] > idle_cutoff
        ]
        for key in stale:
            del self._buckets[key]

    def check(self, key: str, cost: int = 1) -> bool:
        """Return whether ``cost`` events for ``key`` would be admitted, recording nothing.

        Lets a caller consult several limiters and charge them only when all
        of them pass, so one limiter's rejection does not leave another charged.
        """
        cost = max(1, cost)
        now = time.monotonic()
        self._prune(now)

        cutoff = now - self.window_seconds

        while self._global and self._global[0] < cutoff:
            self._global.popleft()
        if len(self._global) + cost > self.global_max_events:
            return False

        times = self._buckets.get(key)
        if times is not None:
            while times and times[0] < cutoff:
                times.popleft()
            if len(times) + cost > self.max_events:
                return False
        return True

    def record(self, key: str, cost: int = 1) -> None:
        """Record ``cost`` events for ``key`` unconditionally (pair with ``check``)."""
        cost = max(1, cost)
        now = time.monotonic()
        self._buckets.setdefault(key, deque()).extend([now] * cost)
        self._global.extend([now] * cost)

    def refund(self, key: str, cost: int = 1) -> None:
        """Remove up to ``cost`` of the most recent events for ``key``.

        For callers that charge before doing the work - so concurrent requests
        cannot all slip past the check - and then decide the request should
        not have counted.
        """
        times = self._buckets.get(key)
        for _ in range(max(1, cost)):
            if not times or not self._global:
                return
            times.pop()
            self._global.pop()

    def report_blocked(self) -> None:
        """Emit the rate_limit.blocked event for this limiter."""
        log_event("rate_limit.blocked", limiter=self.name)

    def allow(self, key: str, cost: int = 1) -> bool:
        """Record ``cost`` events for ``key``; return False when it should be rejected.

        ``cost`` lets one request that does N units of work (a log batch) be
        charged N, so batching cannot multiply the effective limit. A rejected
        call records nothing.
        """
        if not self.check(key, cost):
            return False
        self.record(key, cost)
        return True

    def reset(self) -> None:
        """Drop all recorded state (used by tests)."""
        self._buckets.clear()
        self._global.clear()
        self._last_prune = 0.0


def enforce_rate_limit(
    limiter: SlidingWindowLimiter,
    request,
    *,
    detail: str = "Too many requests",
    cost: int = 1,
    headers: Mapping[str, str] | None = None,
) -> None:
    """Charge ``cost`` to the caller's bucket, or raise 429 with ``detail``."""
    if not limiter.allow(client_ip(request), cost=cost):
        limiter.report_blocked()
        raise HTTPException(status_code=429, detail=detail, headers=dict(headers) if headers else None)
