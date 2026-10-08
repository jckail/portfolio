# Jordan Kail brand kit

Version 1 · October 8, 2026. Source of truth: frontend/src/styles/base/variables.css and theme.css.
Public visual reference: /brand-kit.html. Downloadable marks: /brand/jordan-kail-mark.svg and /brand/jordan-kail-wordmark.svg.

## Direction

An engineering portfolio with a recognizable electric-indigo signal, Quantico display type and calm Montserrat reading text. Lead with the engineer's contribution and evidence. Preserve generous reading widths rather than filling the page with technology logos.

## Palette and themes

| Role | Light | Dark |
| --- | --- | --- |
| Page | #ffffff | #000000 |
| Foreground | #000000 | #ffffff |
| Secondary text | #535353 | #d4d4d4 |
| Primary fill | #0403ff | #0403ff |
| Accessible accent text | #0403ff | #8b8aff |

Indigo is for action fills; use the lighter accent for text on dark backgrounds. Do not use #0403ff for small text on black. Theme-colored OpenAI and Claude button marks use CSS masks and currentColor. Respect third-party brand attribution and do not imply endorsement.

## Typography and spacing

Quantico bold: name, headings and short interface labels. Montserrat: descriptions and reading text. Self-hosted files remain the web source; do not introduce external font requests. 4px spacing base; 16/24/32/48px primary rhythm. Body line height 1.6 and measure at most 65ch. Display name 40–72px, section titles 26–36px. Touch targets 44px minimum.

## Marks

The JK monogram is an original compact portfolio asset. Keep at least one quarter of its width as clear space. Minimum display size 24px; use the name in accessible text when an asset is decorative. The wordmark uses live text and requires Quantico locally for its intended rendering; outline the text in an approved export before print production. Avoid claiming it is a registered trademark.

## Product family

OpenDataCenter, Kefi, JobDog and Jobbr retain their own names and marks. The portfolio provides consistent card typography, spacing, status badges and evidence links, not replacement product identities. Until an approved project mark is available, use a neutral project icon rather than inventing a logo. Separate public product links from private repository source.

Card contract: name, accurate maturity (Live / Prototype / Employer work / Archived), brief purpose, Jordan's verified contribution, and public evidence. Do not invent adoption, revenue, performance, employer IP or launch status. For case studies distinguish implementation from deployment and acceptance.

## Voice

Specific and direct. “Created the Agent Platform team” is stronger than “passionate visionary.” State constraints and tradeoffs. Only publish approved metrics with a source. Use “Connect your agent” and “Chat with my Agent” consistently. Calendar scheduling remains deferred.

## Accessibility and motion

Foreground and focus rings must remain legible in both themes. Navigation glass uses an 86% theme surface plus blur, never reduced opacity on text. Honor reduced transparency; avoid automatic entrance animations. Preserve keyboard access, visible focus, modal focus restoration and screen-reader names. Do not place floating navigation over the agent launcher.

## Reuse checklist

- Match live theme tokens instead of hard-coding a new palette.
- Use one primary action; distinguish reading links from state-changing controls.
- Verify narrow screens, 200% zoom, keyboard and light/dark.
- Keep company and product marks original; record new asset provenance.
- Recheck downloadable assets after type, name or palette changes.
