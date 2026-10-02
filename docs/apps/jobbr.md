# Jobbr demo (`/jobbr`)

Hosted lab for the `jobbr` project (repo `jckail/Jobbr`). Content comes from `backend/app/data/labs/jobbr.json`; the UI is
`frontend/src/app/labs/jobbr/`.

## What the real project does
From its README: scrapes tech job postings, parses raw HTML into structured JSON (`company_name`, `title`, `description`,
`location`, `requirements`, `benefits`, `salary`) using LLMs, and matches postings to a resume. The README is under active
development; this demo only mirrors that documented flow.

## What the demo does instead
- `generator.ts`: fictional postings as raw HTML-like text, seeded PRNG (`prng.ts`), so the same seed gives the same data.
- `parser.ts`: rule-based parser (heading synonyms, `Location:`/`Salary:` labels, vocabulary in `skills.ts`). Each field is
  traceable; missing fields stay empty. No LLM.
- `matcher.ts`: `score = sum(weight x fit) / sum(weights)` over required skills, nice-to-have skills, experience and
  location. Weights are user-adjustable; the explanation lists matched and missing skills.
- Resume text is processed in the tab only. No network calls, no storage, no timers.

## Honesty rules
Every posting is synthetic. The pipeline view is illustrative: it shows counts for the current synthetic data and no timings
or throughput. Do not add performance claims.

## Tests
`logic.test.ts`, `lab.test.tsx` (vitest) and `e2e/tests/jobbr.spec.ts` (Playwright, content only).
