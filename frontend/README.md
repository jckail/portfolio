# Frontend Technical Documentation 🎨

## Technology Stack

- **React 18+** with TypeScript
- **React Router** for client-side routing
- **Vite** for fast development and building
- **CSS Modules** for scoped styling
- **Custom Hooks** for shared logic
- **Context API** for state management

## Architecture Overview 🏗️

The frontend follows a feature-based architecture for better maintainability and scalability:

```
src/
├── app/                    # Application core
│   ├── components/        # App-wide components
│   ├── providers/        # Context providers
│   └── styles/          # Global styles
│
├── features/             # Feature modules
│   ├── admin/           # Admin dashboard
│   ├── layouts/         # Page layouts
│   ├── resume/          # Resume components
│   ├── telemetry/       # Usage tracking
│   └── theme/           # Theme management
│
└── shared/              # Shared utilities
    ├── components/      # Reusable components
    ├── hooks/          # Custom hooks
    ├── types/          # TypeScript types
    └── utils/          # Helper functions
```

## Key Features 🔑

### Theme Management
- Light/Dark mode support
- CSS variables for consistent theming
- Smooth theme transitions
- System preference detection

### Resume Components
- Interactive sections
- Responsive layouts
- Animated transitions
- Dynamic content loading

### Performance Optimizations
- Code splitting
- Lazy loading
- Memoized components
- Optimized assets

## Development Guide 👩‍💻

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Code Quality Tools
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety
- Vitest for unit testing

### Best Practices

#### Component Guidelines
- Use functional components with hooks
- Implement proper TypeScript types
- Follow React best practices
- Maintain single responsibility

#### State Management
- Use Context for global state
- Local state for component-specific data
- Custom hooks for shared logic
- Proper error boundaries

#### Styling
- CSS Modules for component styles
- Global variables for theming
- Mobile-first approach
- BEM naming convention

## API Integration 🔌

The frontend communicates with the FastAPI backend through:
- RESTful endpoints
- Type-safe API calls
- Error handling
- Loading states

## Testing Strategy 🧪

- Unit tests for components
- Integration tests for features
- E2E tests for critical paths
- Snapshot testing for UI

## Contributing 🤝

1. Follow the existing architecture
2. Maintain code style guidelines
3. Write tests for new features
4. Document your changes
