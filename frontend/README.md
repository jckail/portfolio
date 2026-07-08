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
│   ├── hooks/               # useScrollSpy, useMediaQuery, ...
│   └── utils/               # Analytics (GA4), API helpers
│
├── styles/                  # Global CSS (variables, sections, components)
└── types/                   # Shared TypeScript types
```

## Key Features 🔑

### AI Chat Assistant

- Connects to the backend over WebSocket (`/ws/{client_id}`) and streams
  Claude Haiku 4.5 responses chunk by chunk.
- All chat state lives in a single `useChat()` instance owned by
  `ChatPortal`; the `Chat` component is purely presentational.
- Deep-linkable via `?ai_chat=open`.

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
npm run lint         # ESLint (errors block; warnings allowed)
npm run lint:strict  # ESLint with --max-warnings 0
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

## Contributing 🤝

1. Follow the existing architecture (`app/` features, `shared/` reusables)
2. Keep components typed — avoid `any`
3. Add tests for new behavior
4. Run `npm run lint && npm run type-check && npm test` before pushing
