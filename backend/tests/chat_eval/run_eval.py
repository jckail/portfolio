"""Live chat-assistant evaluation runner.

Talks to a running backend over the real /ws/{client_id} protocol and scores
each reply deterministically (see scoring.py). It calls the real model, so it
is never part of CI. Usage, from the repo root:

    .venv/bin/python -m backend.tests.chat_eval.run_eval --url ws://localhost:9170 \
        [--only g01,t02] [--category safety] [--json out.json]

Start the backend with a real provider key first. The runner never reads or
prints keys. Token counts are estimated (~4 characters per token) because the
socket protocol does not expose provider usage.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import statistics
import sys
import time
import uuid
from collections import deque

from .scoring import load_cases, load_corpus, score_case, validate_cases

IP_LIMIT_PER_MIN = 26  # server allows 30 per IP per 60 s; stay under it
CONCURRENCY = 3  # server allows 5 sockets per IP


class Throttle:
    def __init__(self, per_minute: int):
        self.per_minute, self.stamps, self.lock = per_minute, deque(), asyncio.Lock()

    async def wait(self) -> None:
        async with self.lock:
            while True:
                now = time.monotonic()
                while self.stamps and now - self.stamps[0] > 61:
                    self.stamps.popleft()
                if len(self.stamps) < self.per_minute:
                    self.stamps.append(now)
                    return
                await asyncio.sleep(61 - (now - self.stamps[0]))


async def run_case(case: dict, base_url: str, throttle: Throttle, limit: float) -> dict:
    import websockets  # imported lazily: only the live runner needs it

    client_id = f"eval-{case['id']}-{uuid.uuid4().hex[:8]}"[:100]
    result: dict = {"text": "", "frames": [], "ttfc": None, "elapsed": 0.0}
    chunks: list[str] = []
    try:
        async with websockets.connect(f"{base_url.rstrip('/')}/ws/{client_id}", open_timeout=15) as ws:
            if case.get("context"):
                await ws.send(json.dumps({"type": "context", "content": case["context"]}))
            for message in case["messages"]:
                await throttle.wait()
                started = time.monotonic()
                await ws.send(json.dumps({"type": "message", "content": message}))
                while True:
                    frame = json.loads(await asyncio.wait_for(ws.recv(), limit))
                    if "type" in frame:
                        result["frames"].append(frame)
                        continue
                    if frame.get("is_chunk"):
                        if result["ttfc"] is None:
                            result["ttfc"] = time.monotonic() - started
                        chunks.append(frame["message"])
                        continue
                    final = frame.get("message", "")
                    if not chunks:  # non-streamed reply (e.g. a rate-limit notice)
                        chunks.append(final)
                    break
                result["elapsed"] += time.monotonic() - started
                result["text"] = "".join(chunks)
                if message is not case["messages"][-1]:
                    chunks.append("\n")
    except Exception as exc:  # noqa: BLE001 - report any transport failure per case
        result["error"] = f"{type(exc).__name__}: {exc}"[:200]
    if result["text"].startswith("You're sending messages very quickly"):
        result["error"] = "server rate limit hit (30 messages/min per IP); wait 60s and rerun"
    return result


async def run_all(cases: list[dict], base_url: str, limit: float) -> list[dict]:
    throttle, sem = Throttle(IP_LIMIT_PER_MIN), asyncio.Semaphore(CONCURRENCY)

    async def one(case: dict) -> dict:
        async with sem:
            return await run_case(case, base_url, throttle, limit)

    return await asyncio.gather(*(one(c) for c in cases))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--url", default=os.environ.get("CHAT_EVAL_URL", "ws://localhost:8080"))
    ap.add_argument("--only", help="comma-separated case id prefixes")
    ap.add_argument("--category")
    ap.add_argument("--timeout", type=float, default=90)
    ap.add_argument("--json", help="write full results here")
    ap.add_argument("-v", "--verbose", action="store_true", help="print reply text for every case")
    args = ap.parse_args(argv)

    cases = load_cases()
    problems = validate_cases(cases)
    if problems:
        print("\n".join(problems), file=sys.stderr)
        return 2
    if args.only:
        prefixes = tuple(args.only.split(","))
        cases = [c for c in cases if c["id"].startswith(prefixes)]
    if args.category:
        cases = [c for c in cases if c["category"] == args.category]

    corpus, phone = load_corpus(), os.environ.get("CONTACT_PHONE", "")
    results = asyncio.run(run_all(cases, args.url, args.timeout))

    rows, passed = [], 0
    for case, res in zip(cases, results, strict=True):
        fails = score_case(case, res, corpus, phone)
        passed += not fails
        rows.append({"id": case["id"], "category": case["category"], "pass": not fails, "fails": fails, **res})
        print(f"{'PASS' if not fails else 'FAIL'} {case['id']}  ttfc={res['ttfc'] or 0:.1f}s total={res['elapsed']:.1f}s")
        for f in fails:
            print(f"     - {f}")
        if args.verbose or fails:
            print("     > " + res.get("text", "").replace("\n", "\n       ")[:700])
    ttfc = [r["ttfc"] for r in rows if r["ttfc"] is not None]
    out_tokens = sum(len(r.get("text", "")) for r in rows) // 4
    print(f"\n{passed}/{len(rows)} passed; est. output tokens ~{out_tokens}")
    if ttfc:
        q = statistics.quantiles(ttfc, n=20) if len(ttfc) > 1 else ttfc * 19
        print(f"time-to-first-chunk: median {statistics.median(ttfc):.2f}s p95 {q[18]:.2f}s max {max(ttfc):.2f}s")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, indent=1)
    return 0 if passed == len(rows) else 1


if __name__ == "__main__":
    raise SystemExit(main())
