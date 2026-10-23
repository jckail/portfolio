"""Fail closed unless current main has a successful Depot CI `ci-result` check run."""
import argparse
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request

# CI of record is Depot CI (JCK-2026). Its `ci-result` job needs every other job, and Depot
# publishes each job as a check run named "<workflow> / <job>" from the Depot Code Access GitHub
# App (not as a commit status), with a depot.dev details URL.
CI_CONTEXT = "depot-ci / ci-result"
CI_APP_ID = 219785
CI_URL_PREFIX = "https://depot.dev/orgs/f3bqc4vdfr/"


class GateError(Exception):
    pass


class Pending(GateError):
    pass


def verify(get, repository, sha):
    base = f"/repos/{repository}"

    def current():
        if get(base + "/git/ref/heads/main")["object"]["sha"] != sha:
            raise GateError("Deployment commit is no longer current main")

    current()
    result = get(base + f"/commits/{sha}/check-runs?check_name={urllib.parse.quote(CI_CONTEXT)}"
                 f"&app_id={CI_APP_ID}&filter=all&per_page=100")
    runs = result.get("check_runs", [])
    if result.get("total_count", 0) > len(runs):
        raise GateError("CI check result is incomplete")
    runs = [run for run in runs if run.get("name") == CI_CONTEXT and run.get("app", {}).get("id") == CI_APP_ID]
    if not runs:
        raise Pending("Waiting for Depot CI result")
    # Only the newest run for the check counts (reruns supersede earlier attempts).
    latest = max(runs, key=lambda run: (run.get("started_at") or "", run.get("id", 0)))
    if not str(latest.get("details_url", "")).startswith(CI_URL_PREFIX):
        raise GateError("CI result does not come from the expected Depot organization")
    if latest.get("status") != "completed":
        raise Pending("Waiting for latest matching CI run")
    if latest.get("conclusion") != "success":
        raise GateError("Latest matching CI run did not succeed")
    current()
    return latest["id"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wait-seconds", type=int, default=0)
    args = parser.parse_args()
    repository, sha = os.environ.get("GITHUB_REPOSITORY", ""), os.environ.get("GITHUB_SHA", "")
    if repository != "jckail/portfolio" or not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise GateError("Invalid deployment repository or commit")
    token = os.environ["GH_TOKEN"]

    def get(path):
        request = urllib.request.Request("https://api.github.com" + path, headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)

    deadline = time.monotonic() + args.wait_seconds
    while True:
        try:
            status_id = verify(get, repository, sha)
            print(f"Verified current main and Depot CI result check run {status_id}")
            return
        except Pending as exc:
            if time.monotonic() >= deadline:
                raise GateError("CI did not complete within the allowed wait") from exc
            print(str(exc), flush=True)
            time.sleep(min(10, max(0, deadline - time.monotonic())))


if __name__ == "__main__":
    try:
        main()
    except (GateError, KeyError, ValueError, urllib.error.URLError) as exc:
        # Never print raw provider responses or credential-bearing request objects.
        print("::error::" + (str(exc) if isinstance(exc, GateError) else "CI verification API failed"))
        raise SystemExit(1) from None
