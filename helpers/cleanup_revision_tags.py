"""Remove only stale automated zero-traffic tags after verified promotion."""
import argparse
import json
import os
import re
import subprocess

AUTO_TAG = re.compile(r"gh-[0-9a-f]{7}")


class CleanupError(Exception):
    pass


def inspect_service(document, service, current_tag, revision, failed_canary=False):
    if not AUTO_TAG.fullmatch(current_tag) or not revision.startswith(service + "-"):
        raise CleanupError("Invalid current release identity")
    if document.get("metadata", {}).get("name") != service:
        raise CleanupError("Unexpected service identity")
    status = document.get("status", {})
    generation = document.get("metadata", {}).get("generation")
    observed = status.get("observedGeneration")
    if type(generation) is not int or generation < 1 or type(observed) is not int or observed != generation:
        raise CleanupError("Service status does not match the current generation")
    if not any(c.get("type") == "Ready" and c.get("status") == "True"
               for c in status.get("conditions", [])):
        raise CleanupError("Service is not ready")
    traffic = status.get("traffic")
    if not isinstance(traffic, list) or not traffic:
        raise CleanupError("Missing traffic state")
    tags, percentages = {}, {}
    for target in traffic:
        if not isinstance(target, dict):
            raise CleanupError("Malformed traffic target")
        name, percent = target.get("revisionName"), target.get("percent", 0)
        if (not isinstance(name, str) or not name.startswith(service + "-")
                or type(percent) is not int or not 0 <= percent <= 100):
            raise CleanupError("Malformed revision or percentage")
        percentages[name] = percentages.get(name, 0) + percent
        tag = target.get("tag")
        if tag is not None:
            if not isinstance(tag, str) or not tag or tag in tags:
                raise CleanupError("Malformed or duplicate tag")
            tags[tag] = (name, percent)
    if sum(percentages.values()) != 100:
        raise CleanupError("Production traffic does not sum to 100")
    if failed_canary:
        # Never remove a tag from a revision receiving any production traffic.
        target = tags.get(current_tag)
        if target is not None and target[0] != revision:
            raise CleanupError("Failed canary tag was reassigned")
        stale = [current_tag] if target is not None and percentages.get(revision, 0) == 0 else []
    else:
        if percentages.get(revision) != 100:
            raise CleanupError("Current release does not serve all production traffic")
        if tags.get(current_tag, (None,))[0] != revision:
            raise CleanupError("Current release tag does not match verified revision")
        stale = sorted(tag for tag, (name, percent) in tags.items()
                       if AUTO_TAG.fullmatch(tag) and tag != current_tag
                       and name != revision and percent == 0)
    return stale, tags, {name: percent for name, percent in percentages.items() if percent}


def cleanup(run, service, project, region, current_tag, revision, failed_canary=False):
    common = [service, "--project", project, "--region", region]

    def read():
        return inspect_service(json.loads(run(["gcloud", "run", "services", "describe", *common, "--format=json"])),
                               service, current_tag, revision, failed_canary)

    stale, tags, traffic = read()
    if not stale:
        print("No stale automated tags to remove")
        return []
    if read() != (stale, tags, traffic):
        raise CleanupError("Service tags or traffic changed before cleanup")
    run(["gcloud", "run", "services", "update-traffic", *common,
         "--remove-tags=" + ",".join(stale), "--quiet"])
    _, after_tags, after_traffic = read()
    kept = {tag: value for tag, value in tags.items() if tag not in stale}
    if any(tag in after_tags for tag in stale) or after_tags != kept or after_traffic != traffic:
        raise CleanupError("Cleanup readback differs from the intended tag-only change")
    print(f"Removed {len(stale)} stale automated tags; production traffic preserved")
    return stale


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--failed-canary", action="store_true")
    args = parser.parse_args()
    def run(arguments):
        return subprocess.run(arguments, check=True, capture_output=True, text=True).stdout
    cleanup(run, os.environ["SERVICE"], os.environ["PROJECT_ID"], os.environ["REGION"],
            os.environ["TAG"], os.environ["REVISION"], args.failed_canary)


if __name__ == "__main__":
    try:
        main()
    except (CleanupError, KeyError, ValueError, TypeError, AttributeError, subprocess.CalledProcessError) as exc:
        print("::error::" + (str(exc) if isinstance(exc, CleanupError) else "Tag cleanup failed; inspect service state"))
        raise SystemExit(1) from None
