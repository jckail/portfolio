"""Process-local counters for the admin health/analytics endpoints.

Per-instance and in-memory on purpose: Cloud Run instances do not share state,
and the durable record is the structured logs plus the log-based metrics
built on them. Everything here is bounded: keys come from fixed enums or are
capped, so an anonymous caller cannot grow the maps.
"""
from __future__ import annotations

import threading
import time
from collections import Counter

MAX_KEYS = 200

_lock = threading.Lock()
_started = time.time()
_status_classes: Counter[str] = Counter()
_events: Counter[str] = Counter()
_rate_limit_hits: Counter[str] = Counter()
_event_names: Counter[str] = Counter()


def _bump(counter: Counter[str], key: str, amount: int = 1) -> None:
    # A new key past the cap is folded into "other" rather than dropped.
    if key not in counter and len(counter) >= MAX_KEYS:
        key = "other"
    counter[key] += amount


def count_status(status: int) -> None:
    with _lock:
        _bump(_status_classes, f"{status // 100}xx")


def count_event(event: str, limiter: str | None = None, name: str | None = None) -> None:
    with _lock:
        _bump(_events, event)
        if event == "rate_limit.blocked":
            _bump(_rate_limit_hits, limiter or "unnamed")
        elif event == "event.received" and name:
            _bump(_event_names, name)


def snapshot() -> dict:
    with _lock:
        return {
            "uptime_seconds": int(time.time() - _started),
            "requests_by_status_class": dict(_status_classes),
            "events": dict(_events),
            "rate_limit_hits": dict(_rate_limit_hits),
            "event_names": dict(_event_names),
        }


def reset() -> None:
    """Drop all counters (used by tests)."""
    global _started
    with _lock:
        _status_classes.clear()
        _events.clear()
        _rate_limit_hits.clear()
        _event_names.clear()
        _started = time.time()
