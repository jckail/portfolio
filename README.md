![Portfolio Banner](readMeBanner.png)

# Professional Portfolio 🚀

Welcome to my professional portfolio! Visit [jckail.com](https://www.jckail.com) to see it in action.

## Overview 🎯

This portfolio is a modern, full-stack web application showcasing my
professional experience through an interactive and engaging interface —
React + TypeScript on the frontend, FastAPI on the backend, and an AI
assistant powered by Anthropic's Claude Haiku 4.5.

## Key Features ✨

### Interactive Resume Experience
- 📝 Dynamic professional timeline with detailed experiences
- 🛠️ Comprehensive skills showcase with proficiency levels
- 📊 Project portfolio with live demos and descriptions
- 📄 Downloadable PDF resume

### Smart Interactions
- 🤖 AI chat assistant (Claude Haiku 4.5, streamed over WebSocket) with
  conversation memory, page-aware context, and **site-navigation tools**
  (open sections/modals, download resume)
- 🔗 Deep-linkable sections, modals, projects, and chat (`?ai_chat=open`,
  `?project=`, `?skill=`, `?company=`)
- ⌨️ Keyboard shortcuts: `?` opens chat; `g` then `a/e/p/s/r` jumps sections;
  `Ctrl/Cmd+K` command palette
- 🎨 Interactive doodle canvas (footer easter egg) + party mode (Konami /
  `?party=1`)
- 🍪 Cookie consent with GA consent-mode defaults
- 📱 Responsive design for all devices
- ♿ Fully keyboard-operable: focus-trapped dialogs, Escape-to-close
- 🌓 Light/dark mode — and a hidden party mode 🎉

### Professional Network
- 🔗 [LinkedIn](https://www.linkedin.com/in/jordan-kail)
- 💻 [GitHub](https://github.com/jkail-dev)
- 📧 Direct contact form (SendGrid)

## Technology Stack 💻

### Frontend 🎨
- **React 18 + TypeScript** with **Vite** for fast dev and optimized builds
- **React Router** for navigation
- **Zustand** for state management
- **MUI** + CSS custom properties for UI and theming
- **Vitest** for unit tests

### Backend 🔧
- **FastAPI** on **Python 3.12** with **Pydantic v2**
- **Anthropic Claude Haiku 4.5** for the streaming AI chat assistant
- **Supabase** for auth, telemetry, and log persistence
- **SendGrid** for contact email

### Infrastructure ☁️
- **Docker** multi-stage builds (Node 22 → Python 3.12 slim)
- **Google Cloud Run** behind **Artifact Registry**
- **Terraform** for infrastructure as code, including keyless GitHub → GCP
  auth via Workload Identity Federation (see [`infra/`](./infra/README.md))
- **GitHub Actions**: CI (lint, tests, Docker and Terraform checks for both
  stacks) plus automatic deploys to Cloud Run on `main`
  (see [DEPLOYMENT.md](./DEPLOYMENT.md))
- **Dependabot** for monthly grouped dependency updates

## Repository Layout 📂

```
portfolio/
├── frontend/          # React application (see frontend/README.md)
│   └── src/
│       ├── app/       # Feature components & providers
│       ├── shared/    # Stores, hooks, typed API client, shared components
│       └── styles/    # Global CSS
│
├── backend/           # FastAPI server (see backend/README.md)
│   ├── app/
│   │   ├── api/       # API routes (REST + chat WebSocket)
│   │   ├── config.py  # Centralized typed settings (all env access)
│   │   ├── models/    # Pydantic models + data loaders
│   │   ├── data/      # Portfolio content (JSON)
│   │   └── utils/     # Logging, Supabase client
│   ├── assets/        # System prompt, resume
│   └── tests/         # Pytest suite (runs offline, no credentials needed)
│
├── infra/             # Terraform for GCP (Cloud Run, secrets, registry, WIF)
├── helpers/           # Deploy script, Dockerfiles, local dev tooling
└── .github/workflows/ # CI + automatic Cloud Run deploys
```

## Getting Started 🚀

### Prerequisites
- Node.js 20+ and npm
- Python 3.12+
- A `.env` file at the repo root (see [backend/README.md](./backend/README.md)
  for the full variable list)

### Development Setup

```bash
git clone https://github.com/jckail/portfolio.git
cd portfolio

pip install -r requirements-dev.txt   # prod deps + pytest, ruff
(cd frontend && npm install)

./helpers/local_test.sh
```

Then open:

- Frontend (hot reload): http://localhost:5173
- Backend API + built frontend: http://localhost:8080
- API documentation: http://localhost:8080/docs

### Deployment

Merges to `main` deploy automatically to Cloud Run via GitHub Actions once
the one-time setup in [DEPLOYMENT.md](./DEPLOYMENT.md) is complete. Manual
fallback:

```bash
./helpers/deploy.sh          # build, push, deploy to Cloud Run, health-check
```

See [helpers/README.md](./helpers/README.md) for the deploy script and
[infra/README.md](./infra/README.md) for Terraform-managed infrastructure.

## Architecture 🏗️

```mermaid
flowchart LR
  Visitor -->|HTTPS| CloudRun[Cloud Run]
  CloudRun --> FastAPI
  FastAPI -->|static| React[React SPA]
  FastAPI -->|REST| Content[Portfolio JSON]
  FastAPI -->|WebSocket + tools| Claude[Claude Haiku 4.5]
  FastAPI --> Supabase[(Supabase)]
  FastAPI --> SendGrid[SendGrid]
  GH[GitHub Actions] -->|WIF| AR[Artifact Registry]
  AR --> CloudRun
  TF[Terraform] --> CloudRun
```

Visitor traffic hits Cloud Run, which serves the Vite-built SPA and the
FastAPI API (including the streaming chat WebSocket). Claude can request
validated UI actions that the SPA executes. Secrets live in Secret Manager;
deploys are keyless via Workload Identity Federation.

## Documentation 📚

- [Frontend documentation](./frontend/README.md)
- [Backend documentation](./backend/README.md)
- [Deployment checklist (secrets & CI/CD setup)](./DEPLOYMENT.md)
- [Deployment tooling](./helpers/README.md)
- [Infrastructure (Terraform)](./infra/README.md)
- [Improvement roadmap](./ROADMAP.md)
- API reference: `/docs` on a running backend

## Contributing 🤝

1. Follow the existing architecture patterns
2. Run the checks locally:
   - Frontend: `npm run lint && npm run type-check && npm test`
   - Backend: `python -m ruff check backend && python -m pytest backend/tests`
3. Write tests for new features
4. Update documentation
5. Submit pull requests for review
