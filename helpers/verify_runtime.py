"""Bounded public liveness probes tied to the deployment's immutable commit."""
import argparse
import json
import re
import subprocess
import time
from urllib.parse import urlsplit


class RuntimeProbeError(Exception):
    pass


def verify_runtime(url, sha, attempts=12, *, run=subprocess.run, sleep=time.sleep):
    parsed = urlsplit(url)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or parsed.path not in ("", "/")):
        raise RuntimeProbeError("Expected an HTTPS service origin")
    if not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise RuntimeProbeError("Expected an immutable deployment commit")
    if type(attempts) is not int or not 1 <= attempts <= 12:
        raise RuntimeProbeError("Runtime probe attempts must be between one and twelve")

    for attempt in range(attempts):
        try:
            result = run(
                ["curl", "--silent", "--show-error", "--connect-timeout", "5", "--max-time", "10",
                 "--write-out", "\n%{http_code}", "--url", url.rstrip("/") + "/api/health"],
                capture_output=True, text=True, timeout=15, check=False,
            )
            body, _, status = result.stdout.rpartition("\n")
            if result.returncode == 0 and status == "200":
                health = json.loads(body)
                # The site serves local JSON even when Supabase is unavailable.
                # Preserve liveness semantics; readiness is a separate contract.
                if (isinstance(health, dict) and health.get("status") in ("healthy", "degraded")
                        and isinstance(health.get("checks"), dict)
                        and isinstance(health["checks"].get("version"), dict)
                        and health["checks"]["version"].get("hash") == sha):
                    return
        except (OSError, subprocess.TimeoutExpired, ValueError):
            pass
        if attempt + 1 < attempts:
            sleep(5)
    raise RuntimeProbeError("Runtime did not return liveness for the exact deployment commit")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--sha", required=True)
    args = parser.parse_args()
    verify_runtime(args.url, args.sha)
    print("Verified runtime liveness and exact deployment commit")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeProbeError, ValueError) as error:
        # Do not emit public response bodies or request/transport objects.
        print("::error::" + (str(error) if isinstance(error, RuntimeProbeError) else "Invalid service origin"))
        raise SystemExit(1) from None
