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
  conversation memory and page-aware context
- 🔗 Deep-linkable sections, modals, and chat (`?ai_chat=open`)
- 📱 Responsive design for all devices
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
- **Terraform** for infrastructure as code (see [`infra/`](./infra/README.md))
- **GitHub Actions** CI (lint, type-check, test, build for both stacks)

## Repository Layout 📂

```
portfolio/
├── frontend/          # React application (see frontend/README.md)
│   └── src/
│       ├── app/       # Feature components & providers
│       ├── shared/    # Stores, hooks, utils, shared components
│       └── styles/    # Global CSS
│
├── backend/           # FastAPI server (see backend/README.md)
│   ├── app/
│   │   ├── api/       # API routes (REST + chat WebSocket)
│   │   ├── models/    # Pydantic models + data loaders
│   │   ├── data/      # Portfolio content (JSON)
│   │   └── utils/     # Logging, Supabase client
│   └── assets/        # System prompt, resume
│
├── infra/             # Terraform for GCP (Cloud Run, secrets, registry)
└── helpers/           # Deploy script, Dockerfiles, local dev tooling
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

pip install -r requirements.txt
(cd frontend && npm install)

./helpers/local_test.sh
```

Then open:

- Frontend (hot reload): http://localhost:5173
- Backend API + built frontend: http://localhost:8080
- API documentation: http://localhost:8080/docs

### Deployment

```bash
./helpers/deploy.sh          # build, push, deploy to Cloud Run, health-check
```

See [helpers/README.md](./helpers/README.md) for the deploy script and
[infra/README.md](./infra/README.md) for Terraform-managed infrastructure.

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
2. Run the checks locally: `npm run lint && npm run type-check && npm test`
   (frontend) and `python -m compileall backend` (backend)
3. Write tests for new features
4. Update documentation
5. Submit pull requests for review
