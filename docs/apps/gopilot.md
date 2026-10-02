# goPilot lab (/gopilot)

Hosted demo for project key `go_pilot` (repo `jckail/goPilot`). It is a browser-only replay: no network calls, no real model, no execution.

## Source of truth

The replay mirrors the public repo (read at its September 2024 state):

- `ezRun.sh` (the README's `localtest/run.sh`): flags `-d -u -a -r -n -t -c -l -o -x`, the order update context, run, lint, test, thread parsing, and the `> file 2>&1` redirections.
- `goHelpers/errorParser.py`: keeps a line when it contains `Failed`, `Error`, `ExpiredToken`, `status code: 400` or `.go` (case-sensitive), then creates an assistant thread from the kept lines.
- `goHelpers/addGo.py` `createThread`: the prompt templates (no errors asks about TODOs; otherwise the list template, which also wins for a single error because the later `if` overwrites the earlier one), thread, message, run, polling, "View response here" link.
- `goHelpers/chatParse.py`: de-duplicates the "View response here:" lines.

## What is canned (illustrative, invented for the demo)

The `stats/stats.go` snippet and its bug, all console output of `go run`, `golangci-lint` and `go test`, the thread ids, and the three assistant replies and the fix diff. All are labelled in the UI. File names in the context list are examples of the `<package>_go.txt` naming the prompt describes.

## Layout

- `frontend/src/app/labs/gopilot/logic.ts`: pure logic (command builder, parser, prompt, plan, diff), tested in `logic.test.ts`.
- `lab.tsx` / `gopilot.css`: UI, tested in `lab.test.tsx`.
- `backend/app/data/labs/gopilot.json`: server-rendered content.
- `e2e/tests/gopilot.spec.ts`: hermetic content smoke.

## Notes

The repo's `main.py` contains a hard-coded credential. It is not reproduced anywhere here; the owner may want to rotate it and remove it from history.
