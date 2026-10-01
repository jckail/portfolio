# 0007: Published content states only sourced facts, and placeholders fail the build

**Status:** Accepted (2026-10)

## Context

The site is read by recruiters, resume parsers and LLM agents, and the same
content is rendered in many places: the SPA, the crawler HTML snapshot,
`llms.txt`, `resume.json`, the resume PDF and text, and the chat prompt. Content
drafts used metric templates (`{{TOKEN}}`) that were to be filled in later. A
template that slipped through would publish a broken claim; a guessed number
would publish a false one. The resume has also drifted from the data before
(it advertised a stale employer for months).

## Decision

1. **One source of truth.** Facts live in `backend/app/data/*.json`. Everything
   else is derived: the resume PDF, text and manifest
   (`helpers/build_resume_pdf.py`), the snapshot, JSON-LD, `llms.txt`,
   `resume.json` and the sitemap (`backend/app/api/discovery.py`). Tests
   (`test_resume_pdf.py`, `test_data.py`, `test_discovery.py`) fail when a
   derived artifact disagrees with the data.
2. **Truthfulness rule.** Content, prompts and docs use only facts the owner
   stated or that are already in the data files. No invented numbers, products,
   patent counts, titles, dates or education. If a figure cannot be sourced it
   is left out. No phone number, key or private-notes reference is committed.
3. **Placeholder guard.** `backend/tests/test_content_placeholders.py` scans
   the data files, the system prompt, the resume text and manifest, the
   resume PDF text, `frontend/index.html` and text files in `frontend/public`
   for `{{...}}`, `[[...]]`, `TODO`, `TBD`, `FIXME`, lorem ipsum and
   `<placeholder`, and fails the build on any hit.

## Consequences

- Updating a role is a data edit plus one regeneration, and the diff is
  reviewable.
- The guard catches unfinished templates, not false statements. Truthfulness
  still depends on the author and the reviewer checking each claim against
  the owner's own words.
- A new published text surface should be added to the guard's list.
