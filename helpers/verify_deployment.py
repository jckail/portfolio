"""Fail closed unless current main has completed the trusted push CI workflow."""
import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request

EXPECTED_JOBS = {
    "Frontend (lint, type-check, test, build)",
    "Backend (compile, test)",
    "Terraform (fmt, validate)",
    "Docker (build production image)",
}


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
    workflow = get(base + "/actions/workflows/ci.yml")
    if workflow["path"] != ".github/workflows/ci.yml" or workflow["state"] != "active":
        raise GateError("Expected CI workflow is unavailable")
    result = get(base + f"/actions/workflows/{workflow['id']}/runs?event=push&branch=main&head_sha={sha}&per_page=100")
    runs = result["workflow_runs"]
    if result["total_count"] != len(runs):
        raise GateError("CI run result is incomplete")
    if not runs:
        raise Pending("Waiting for CI push run")
    run = max(runs, key=lambda item: item["id"])
    if (run["workflow_id"] != workflow["id"] or run["head_sha"] != sha
            or run["event"] != "push" or run["head_branch"] != "main"
            or run["head_repository"]["full_name"] != repository):
        raise GateError("CI identity does not match the deployment")
    if run["status"] != "completed":
        raise Pending("Waiting for latest matching CI run")
    if run["conclusion"] != "success":
        raise GateError("Latest matching CI run did not succeed")
    attempt = run["run_attempt"]
    result = get(base + f"/actions/runs/{run['id']}/attempts/{attempt}/jobs?per_page=100")
    jobs = result["jobs"]
    if (result["total_count"] != len(jobs)
            or not EXPECTED_JOBS.issubset({job["name"] for job in jobs})
            or any(job["head_sha"] != sha or job["status"] != "completed"
                   or job["conclusion"] != "success" for job in jobs)):
        raise GateError("Expected CI jobs are missing, incomplete or unsuccessful")
    after = get(base + f"/actions/runs/{run['id']}")
    if (after["run_attempt"] != attempt or after["status"] != "completed"
            or after["conclusion"] != "success"):
        raise GateError("CI changed while verification was in progress")
    current()
    return run["id"], attempt


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
            run, attempt = verify(get, repository, sha)
            print(f"Verified current main and CI run {run}, attempt {attempt}")
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
