# Apps on jckail.com: hosted demos and forwards

Portfolio projects reach `https://www.jckail.com/<slug>` in one of two ways.

| Kind | What `/<slug>` does | Use it when |
|---|---|---|
| Hosted lab | Serves an interactive, client-side demo from this site (HTTP 200, server-rendered document) | The project has no live product of its own. The demo is synthetic data that runs in the visitor's browser |
| Forward | Answers `302` to the app's own domain | The app already lives at its own domain |

`/dataplayground` is a separate, older feature with its own code and is not part of this platform.

## Slug rules

`^[a-z][a-z0-9]{2,30}$`, unique across labs and forwards. These are reserved and rejected:
`api, admin, assets, fonts, images, ws, docs, static, dataplayground, health, robots, sitemap, llms, resume, favicon`.
The rules live in `backend/app/models/labs.py`; the SPA mirrors the reserved list in
`frontend/src/app/labs/lab-path.ts`.

## Add a forward

Append to `backend/app/data/forwards.json`:

```json
{"slug": "pointup", "target": "https://www.pointup.io/", "project_key": "pointup"}
```

`target` must be `https`, with no credentials and no port. `project_key` must exist in `projects.json`.
Both `/<slug>` and `/<slug>/` answer `302` for GET and HEAD, with `X-Robots-Tag: noindex`, a short
`Cache-Control`, and `Location` taken from the data only. Forwards are not in `sitemap.xml`; they are listed
under "Interactive demos" in `/llms.txt` and `/llms-full.txt`. Do not change the target app's Cloud Run service
or domain mapping from this repo.

## Add a hosted lab

1. `backend/app/data/labs/<slug>.json` (the file name must equal the slug):

   | Field | Rule |
   |---|---|
   | `slug` | as above |
   | `project_key` | exists in `projects.json` |
   | `title` | at most 90 characters |
   | `description` | at most 300 characters |
   | `intro` | 1 to 4 truthful paragraphs; they are in the server-rendered HTML, so they show without JavaScript |
   | `features` | 3 to 8 short strings |
   | `repo` | `https://github.com/<owner>/<name>` |
   | `demo_notice` | must say the data is synthetic and the demo runs in the browser |
   | `updated` | `YYYY-MM-DD`; used as the sitemap `lastmod` |

2. `frontend/src/app/labs/<slug>/lab.tsx`: a default-exported React component with no props. It renders its own
   `<h1>` and its content inside `<main>`. Labs are self-contained: no imports from other labs, nothing shared
   except the tokens in `styles/base` and React. `LabHost` finds the folder with
   `import.meta.glob('./*/lab.tsx')`, loads it lazily and wraps it in `LabShell` (skip link, back link, footer with
   `demo_notice` and the repo link, fetched from `GET /api/labs/<slug>`).
3. Tests: Vitest for the logic and main interactions, and `e2e/tests/<slug>.spec.ts` for content.

`backend/tests/test_labs.py` validates every file in `data/labs/` and fails if a hosted slug has no
`frontend/src/app/labs/<slug>/lab.tsx`.

## What the platform serves

- `GET /api/labs` and `GET /api/labs/<slug>`: the validated records (ETag, gzip, short public cache).
- `GET /<slug>` (also `/<slug>/`): HTTP 200 with title, description, canonical URL, Open Graph and Twitter tags,
  JSON-LD (`WebApplication` and `BreadcrumbList`), and an escaped `h1`, intro, feature list, notice and repo link
  inside `#root`. React replaces that fragment when it mounts.
- `sitemap.xml`: one entry per hosted lab. `/llms.txt` and `/llms-full.txt`: an "Interactive demos" section with
  hosted labs (canonical URL) and forwarded apps (their own URL).
- A slug in neither list stays a 404 with the site's Not Found view. A slug with data but no frontend folder shows
  a "not available in this build yet" page.

## Where the code is

`backend/app/labs.py` (loader and validation), `labs_document.py` (document), `api/labs_routes.py` (routes and
forward handler), `spa.py` (200 registration), `api/discovery.py` (sitemap and llms),
`frontend/src/app/labs/lab-host.tsx`, `lab-shell.tsx`, `lab-not-found.tsx`.
