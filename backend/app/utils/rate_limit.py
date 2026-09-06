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
"""
from __future__ import annotations

import os
import time
from collections import deque

# How many trusted proxies sit in front of the app. 0 means the last
# X-Forwarded-For entry is the one to trust.
_TRUSTED_PROXY_HOPS = max(0, int(os.getenv("TRUSTED_PROXY_HOPS", "0")))

# Entries idle for longer than this are dropped during pruning so the key space
# cannot grow without bound when every caller presents a distinct address.
_IDLE_EVICT_SECONDS = 900


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

    This value is advisory: it is a bucketing key, never an authorization
    signal, and the global ceiling in SlidingWindowLimiter is what holds if
    this is wrong.
    """
    forwarded = request_or_ws.headers.get("x-forwarded-for")
    if forwarded:
        hops = [h.strip() for h in forwarded.split(",") if h.strip()]
        if hops:
            index = max(0, len(hops) - 1 - _TRUSTED_PROXY_HOPS)
            # Bound the key so a long header cannot inflate the key space.
            return hops[index][:64]
    client = getattr(request_or_ws, "client", None)
    return getattr(client, "host", None) or "unknown"


class SlidingWindowLimiter:
    """Fixed-capacity sliding window over a rolling time period."""

    def __init__(self, max_events: int, window_seconds: float, global_max_events: int | None = None):
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

    def allow(self, key: str) -> bool:
        """Record an event for ``key``; return False when it should be rejected."""
        now = time.monotonic()
        self._prune(now)

        cutoff = now - self.window_seconds

        while self._global and self._global[0] < cutoff:
            self._global.popleft()
        if len(self._global) >= self.global_max_events:
            return False

        times = self._buckets.setdefault(key, deque())
        while times and times[0] < cutoff:
            times.popleft()
        if len(times) >= self.max_events:
            return False

        times.append(now)
        self._global.append(now)
        return True

    def reset(self) -> None:
        """Drop all recorded state (used by tests)."""
        self._buckets.clear()
        self._global.clear()
        self._last_prune = 0.0
