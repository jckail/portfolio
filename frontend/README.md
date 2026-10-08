# Frontend Technical Documentation

React single-page app for [jckail.com](https://www.jckail.com): an
interactive resume with an AI chat assistant, theming (including a hidden
party mode), hosted labs and the Data Playground. Visitor analytics is retired.

## Technology Stack

- **React 18** + **TypeScript** on **Vite 8**
- A small `useLocation` hook (`shared/hooks/use-location.ts`) instead of a router library
- **Zustand** for global state (theme, section, admin, telemetry)
- **MUI 6** (chat dialog) + plain CSS with custom properties for theming
- **Vitest** + Testing Library for unit tests
- **ESLint** + **Prettier** for code quality

## Architecture Overview

```
src/
├── app/                     # Application core
│   ├── agent/               # /agent page and the shared AgentConversation (access gate, evidence cards)
│   ├── dataplayground/      # Data Playground workbench (see docs/dataplayground.md)
│   ├── labs/                # Hosted lab demos, lazy via LabHost (see docs/labs.md)
│   ├── components/          # Feature components
│   │   ├── chat/            # AI assistant (WebSocket streaming, confirmation cards)
│   │   ├── sections/        # About, experience, projects, skills, resume
│   │   └── admin/           # Admin login + telemetry panel
│   └── providers/           # Data, resume, particles providers
│
├── shared/                  # Cross-cutting code
│   ├── analytics/           # Retired typed-event API, kept inert (core, tracker, events list)
│   ├── components/          # Header, navigation, command palette, etc.
│   ├── stores/              # Zustand stores
│   ├── hooks/               # useScrollSpy, useMediaQuery, useEscapeKey, ...
│   └── utils/
│       ├── api/             # Typed API client (getJson/postJson) + endpoint registry
│       ├── analytics.ts     # Retired analytics compatibility APIs
│       ├── bootstrap-data.ts # Reads the content the server inlined into index.html
│       └── a11y.ts          # buttonize(): keyboard support for styled elements
│
├── styles/                  # Global CSS (variables, sections, components)
└── types/                   # Shared TypeScript types
```

All backend calls go through `shared/utils/api` — it throws a typed
`ApiError` with the FastAPI `detail` message on failure, and
`endpoints.ts` is the single registry of backend paths. The one exception
is the resume PDF download, which needs a raw `fetch` for the blob.

## Key Features

### AI Chat Assistant

- Connects to the backend over WebSocket (`/ws/{client_id}`) and streams the
  assistant's reply chunk by chunk. The model behind it (Vertex Gemini or
  Anthropic) is a backend setting; the SPA does not know or care.
- Frames it handles: streamed message chunks, `action` (navigate, open a modal,
  download the resume, switch theme; run only after `chat-actions.ts`
  re-validates them), `confirm_action` and `action_result`.
- `confirm_action` renders a `ConfirmActionCard`. For contact, phone and
  meeting requests the visitor reviews the draft, types their own email and
  presses Confirm, which sends a `confirm_action` frame back (Cancel sends
  `cancel_action`). Nothing is sent or revealed until then, and the server
  ignores unknown or expired ids. A revealed phone number is shown from the
  `action_result` frame only.
- The transcript is kept in `sessionStorage` and replayed to the server in a
  `history` frame after a reconnect.
- All chat state lives in a single `useChat()` instance inside the shared
  `AgentConversation`, which is mounted by the `/agent` page and by the lazy
  right-side pane (`AgentDrawer`). `ChatPortal` renders the bottom-right
  launcher and owns only the pane's open state.
- The pane is deep-linkable via `?ai_chat=open`; `?` or `/` opens it too.
- Access is gated: a two-message anonymous preview, then an email/company
  introduction. See
  [docs/portfolio-assistant-runtime.md](../docs/portfolio-assistant-runtime.md).
- `ChatPortal` checks `GET /api/chat/status` on mount and hides the chat
  button entirely when the backend reports the assistant unavailable.

### Accessibility

- Styled interactive elements (skill items, tags, footer links) use the
  shared `buttonize()` helper: `role="button"`, `tabIndex`, and Enter/Space
  activation.
- Modals carry `role="dialog"` / `aria-modal`, close on Escape via
  `useEscapeKey`, and use backdrop-click dismissal.
- The `jsx-a11y` lint rules are errors; CI fails on violations.

### Theme Management

- Light/dark themes via CSS variables, persisted to `localStorage` and the
  `?theme=` URL param.
- Party mode easter egg: toggle the theme 10 times within 5 seconds, the
  Konami code, `?party=1`, the footer doodle, or the chat `set_theme` tool
  (see `theme-store.ts` and `use-easter-eggs.ts`).

### Navigation & Analytics

- `useScrollSpy` (owned by `MainContent`) syncs the URL hash with the visible section.
- Visitor analytics is retired. Both the legacy helpers and typed `track()`
  API are inert: no GA loader, first-party events, observers, queues, timers,
  or analytics session identifiers. Saved consent cannot enable tracking.
  Existing feature calls remain compatible without collecting visitor activity.
  Chat uses its independent per-tab session and retains the backend wire field.
- Modals (experience, skills, projects, contact) are lazy loaded and
  deep-linkable via query params (`?skill=`, `?project=`, `?company=`). Deep
  links must not use a raw bracket lookup on a parsed object.
- First paint uses content the server inlines into `index.html`
  (`bootstrap-data.ts`) and falls back to `GET /api/...` when it is absent,
  as in the Vite dev server. Crawlers get a separate server-built HTML
  snapshot inside `#root`; React replaces it on mount.

### Build

`vite.config.ts` splits chunks by hand. MUI, Emotion and tsparticles must
**not** be named in `manualChunks`: they are left to the automatic splitter so
they stay in the lazy chat and particles chunks instead of the initial graph.
Read the comment there before changing it. Lighthouse byte budgets in CI guard
the result.

## Development Guide

```bash
npm install          # install dependencies

npm run dev          # dev server on :5173 (proxies /api and /ws to :8080)
npm run build        # type-check + production build
npm run preview      # preview the production build

npm test             # run unit tests once (CI mode)
npm run test:coverage  # with the coverage floors from vitest.config.ts
npm run test:watch   # watch mode
npm run lint         # ESLint (zero warnings allowed)
npm run type-check   # tsc --noEmit
npm run format       # Prettier
```

The dev server proxies both `/api` (REST) and `/ws` (chat WebSocket) to the
backend on `localhost:8080`, so run the backend first (see
[backend/README.md](../backend/README.md)).

## Testing

Browser smoke tests live in `../e2e/` (Playwright). Without local Chromium
libraries, run them in the pinned container with `../helpers/e2e-docker.sh`
against a running server. Unit tests live next to the code they cover (`*.test.ts[x]`) and run with
Vitest + jsdom. `src/test/setup.ts` provides DOM API mocks
(`matchMedia`, `IntersectionObserver`, `ResizeObserver`).

Coverage floors live in `vitest.config.ts` and use `include: ['src/**']`, so
untested files count as zero; do not copy the numbers into docs. Tests focus on
the riskiest client logic:

- `useChat` — WebSocket lifecycle against a fake socket: single-connection
  guarantee, context frame on open, queueing/flush, chunk streaming,
  malformed frames, unmount cleanup, URL sync
- `ConfirmActionCard` and `chat-confirm` — draft validation, email gate,
  confirm and cancel frames
- `shared/analytics` — consent gating, queueing, de-duplication, tracker
- `useSkill` — `?skill=` deep links, back/forward navigation
- `analytics` — session ids, page-view hash de-duplication
- `theme-store` — toggling, persistence, party mode

## Contributing

1. Follow the existing architecture (`app/` features, `shared/` reusables)
2. Keep components typed — avoid `any`
3. Add tests for new behavior
4. Run `npm run lint && npm run type-check && npm test` before pushing
