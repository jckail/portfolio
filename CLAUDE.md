@AGENTS.md

<!-- BEGIN supermemory (managed) -->
## Supermemory

This repo's namespace is `portfolio`. Cross-agent memory (Cursor, Claude Code, Codex, Claude Desktop, ChatGPT) uses Supermemory v5 (`/ns/{namespace}/…`).

- **Search first** on every substantive task (1–3 queries in `portfolio` plus `preferences`) before asking the user or re-deriving a decision.
- **Save after** verified durable outcomes: decisions with rationale, root causes, conventions, handoffs — 1–3 dated sentences via `add_memory` / `supermemory_add`.
- **Never** save secrets, tokens, customer data, or raw transcripts. Do not write to `repo_*__*`, `repo_encore__…`, or `agent_workflows__jkail`.
- Pins (local, usually gitignored): `.supermemory.json`, `.cursor/.supermemory/config.json`, `.claude/.supermemory-claude/config.json`.
- Keep the official Claude auto-capture plugin disabled; use explicit search/add + harness hooks.
<!-- END supermemory (managed) -->

