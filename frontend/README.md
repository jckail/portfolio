# Frontend Technical Documentation 🎨

React single-page app for [jckail.com](https://www.jckail.com): an
interactive resume with an AI chat assistant, theming (including a hidden
party mode), and analytics.

## Technology Stack

- **React 18** + **TypeScript** on **Vite 5**
- **React Router 6** for routing
- **Zustand** for global state (theme, section, admin, telemetry)
- **MUI 6** (chat dialog) + plain CSS with custom properties for theming
- **Vitest** + Testing Library for unit tests
- **ESLint** + **Prettier** for code quality

## Architecture Overview 🏗️

```
src/
├── app/                     # Application core
│   ├── components/          # Feature components
│   │   ├── chat/            # AI assistant (WebSocket streaming)
│   │   ├── sections/        # About, experience, projects, skills, resume
│   │   └── admin/           # Admin login + telemetry panel
│   └── providers/           # Data, resume, particles providers
│
├── shared/                  # Cross-cutting code
│   ├── components/          # Header, navigation, cookie banner, etc.
│   ├── stores/              # Zustand stores
│   ├── hooks/               # useScrollSpy, useMediaQuery, useEscapeKey, ...
│   └── utils/
│       ├── api/             # Typed API client (getJson/postJson) + endpoint registry
│       ├── analytics.ts     # GA4 events (page views, sections, chat, theme)
│       └── a11y.ts          # buttonize(): keyboard support for styled elements
│
├── styles/                  # Global CSS (variables, sections, components)
└── types/                   # Shared TypeScript types
```

All backend calls go through `shared/utils/api` — it throws a typed
`ApiError` with the FastAPI `detail` message on failure, and
`endpoints.ts` is the single registry of backend paths. The one exception
is the resume PDF download, which needs a raw `fetch` for the blob.

## Key Features 🔑

### AI Chat Assistant

- Connects to the backend over WebSocket (`/ws/{client_id}`) and streams
  Claude Haiku 4.5 responses chunk by chunk.
- All chat state lives in a single `useChat()` instance owned by
  `ChatPortal`; the `Chat` component is purely presentational.
- Deep-linkable via `?ai_chat=open`.
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
- Party mode easter egg: toggle the theme 10 times within 5 seconds.

### Navigation & Analytics

- `useScrollSpy` (owned by `MainContent`) syncs the URL hash with the visible
  section and reports section views to GA4.
- Modals (experience, skills, contact) are lazy loaded and deep-linkable via
  query params.

## Development Guide 👩‍💻

```bash
npm install          # install dependencies

npm run dev          # dev server on :5173 (proxies /api and /ws to :8080)
npm run build        # type-check + production build
npm run preview      # preview the production build

npm test             # run unit tests once (CI mode)
npm run test:watch   # watch mode
npm run lint         # ESLint (zero warnings allowed)
npm run type-check   # tsc --noEmit
npm run format       # Prettier
```

The dev server proxies both `/api` (REST) and `/ws` (chat WebSocket) to the
backend on `localhost:8080`, so run the backend first (see
[backend/README.md](../backend/README.md)).

## Testing 🧪

Unit tests live next to the code they cover (`*.test.ts[x]`) and run with
Vitest + jsdom. `src/test/setup.ts` provides DOM API mocks
(`matchMedia`, `IntersectionObserver`, `ResizeObserver`).

Current coverage focuses on the riskiest client logic:

- `useChat` — WebSocket lifecycle against a fake socket: single-connection
  guarantee, context frame on open, queueing/flush, chunk streaming,
  malformed frames, unmount cleanup, URL sync
- `useSkill` — `?skill=` deep links, back/forward navigation
- `analytics` — session ids, page-view hash de-duplication
- `theme-store` — toggling, persistence, party mode

## Contributing 🤝

1. Follow the existing architecture (`app/` features, `shared/` reusables)
2. Keep components typed — avoid `any`
3. Add tests for new behavior
4. Run `npm run lint && npm run type-check && npm test` before pushing
