# Jordan Kail brand kit

Version 2 · October 8, 2026. Source of truth: frontend/src/styles/base/variables.css and theme.css.
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


## Component source and adoption

The public `/brand-kit.html` route renders `shared/components/brand/BrandShowcase.tsx` through the existing React entry and ThemeProvider. It imports the production `StatusBadge`, `LoadingSpinner`, and `DataError` and the live `.btn` styles. Its card, navigation and form are explicitly composition specimens; they do not claim to be a second implementation of the project catalogue or contact form. Links lead to the actual timeline and case studies. The preview form neither transmits nor stores its input.

`StatusBadge` accepts text children and an optional tone (`neutral`, `success`, `warning`, `error`). Use neutral unless the tone conveys useful meaning; status text is always visible. Live does not mean audited, profitable, or reliable. Use the registry's exact maturity labels: Live, Prototype, In Development, Employer Work, Archived. A public preview may be In Development with an explanatory maturity note.

`LoadingSpinner` defaults to a named status (“Loading content”). Supply a precise `label` for a single meaningful operation. Use `decorative` inside an already announced skeleton or region to avoid duplicate announcements. `DataError` names the failed area and provides a real page-reload retry; the showcase identifies its error as an illustrative example.

### Layout and shape

| Concern | Authoritative token / convention |
| --- | --- |
| Page grid | `--max-width: 1080px`, `--page-gutter: 16px`; flexible columns collapse without horizontal overflow |
| Reading measure | `--measure: 65ch` |
| Spacing | `--spacing-xs/sm/md/lg/xl/2xl`: 4/8/16/24/32/48px |
| Fluid display | `--text-display`: 40–72px; section `--text-2xl`: 26–36px |
| Body | `--text-base`, `--leading-body: 1.6` |
| Code | `--font-code`: system monospace stack; do not load another font |
| Borders | 1px `--panel-border`; selected/focus controls use `--focus-ring` |
| Corners | `--radius-sm/md/lg/full`: 6/10/16px/pill |
| Motion | `--transition-fast/normal`; no essential information depends on animation |

### Technical semantic tokens

Definitions live in `frontend/src/styles/base/theme.css`; geometry and type stay in `variables.css`. Do not copy a new palette into the showcase. Light, dark and party themes all define these tokens:

- Code: `--code-bg`, `--code-text`; borders reuse `--panel-border`.
- Diagrams: `--diagram-node`, `--diagram-edge`, `--diagram-label`. Use labeled nodes, directional edges and an adjacent text explanation. Preserve a reading order. Do not make a complex SVG the only source of technical detail.
- Charts: `--chart-series-1` through `--chart-series-4`, `--chart-grid`, `--chart-axis`. Label series, provide values in a table, and use shapes/patterns where series overlap. A chart specimen's illustrative values are not portfolio metrics.
- States: `--status-{neutral,success,warning,error}-{bg,text}`. Borders use currentColor. Never encode a state through color alone.

Architecture illustrations use clean bounded boxes, consistent 2px connectors and readable text. Icons supplement labels, preserve original third-party marks, and have appropriate decorative or meaningful accessible names. Avoid decorative complexity in dense technical material.

## Case studies and writing

Use the structured project registry rather than maintaining descriptions in the showcase. A complete case study answers: problem/context; role and ownership; constraints; architecture; decisions and tradeoffs; challenges/resolutions; verified outcomes; evidence links; maturity and limitations. Omit unverified fields. An implementation test is not evidence of real-world adoption. Prefer a reproducible diagram and text explanation over an unsupported scale claim.

Examples:
- Prefer “Created the Agent Platform team after establishing data engineering” when verified; avoid “visionary AI leader.”
- Prefer “Reserves a durable token budget before provider calls”; avoid “unlimited scalability.”
- Label a synthetic demonstration “Illustrative data” rather than implying customer results.

Keep the résumé, homepage and social copy grounded in the same JSON content. Social templates are editable assets, not another authoritative biography. Document dated sources for new claims and retain independent product names and brands.

## Social templates and export

Four editable SVGs live under `frontend/public/brand/`: `social-personal-light.svg`, `social-personal-dark.svg`, `social-project-light.svg`, `social-project-dark.svg`. Each is exactly 1200 × 630, with 72px safe margins and live editable text. Personal templates provide a name/positioning layout; project templates intentionally contain placeholder copy. Replace placeholders and verify claims before publication. Keep title text within its safe area; wrap or reduce size for long project names.

The existing `/images/og-image.png` remains the raster social metadata asset. Do not point `og:image` directly at these editable SVG templates. Export a reviewed PNG with installed fonts; for example, with an already installed Inkscape:

```sh
inkscape frontend/public/brand/social-personal-dark.svg --export-type=png --export-filename=personal-dark.png --export-width=1200 --export-height=630
```

This is a documented export command, not a claim that Inkscape is installed or exports have been generated. Inspect the PNG for clipping, font fallback and contrast before choosing it as a public social image. Raster metadata changes remain a separate reviewed step.

### Licensing and provenance

The JK monogram and social template layouts were authored for this portfolio. The SVG wordmark/templates use live text and declare font fallbacks; they do not embed font binaries. Self-hosted Montserrat and Quantico are governed by their supplied SIL Open Font License files: `frontend/public/fonts/OFL-Montserrat.txt` and `OFL-Quantico.txt`. Preserve these notices when redistributing fonts. Third-party company/product marks remain their respective owners' marks; this kit does not grant rights to them or imply endorsement.

## Version and verification record

v1 established identity, palette, original marks and the initial static reference. v2 adds shared technical tokens, shared status and accessible loading primitives, a React component specimen, and four social templates. Source implementation and automated/browser acceptance are separate: the release owner records executed tests and rendered evidence. No field performance or visual acceptance is implied by this document alone.
