# Quick Resume

A modern, interactive resume website built with React and TypeScript.

## Project Structure

The project follows a feature-based architecture:

```
src/
├── app/                    # Application-wide setup and configuration
│   ├── components/        # App-level components (error boundaries, etc.)
│   ├── providers/        # App-level providers
│   └── styles/          # Global styles
│
├── features/             # Feature-based modules
│   ├── admin/           # Admin feature
│   ├── layouts/         # Layout components
│   ├── resume/          # Resume feature
│   ├── telemetry/       # Telemetry feature
│   └── theme/           # Theme feature
│
└── shared/              # Shared code
    ├── components/      # Shared components
    ├── hooks/          # Shared hooks
    ├── types/          # Shared types
    └── utils/          # Shared utilities
```

Each feature follows a similar structure:

```
feature/
├── components/          # Feature-specific components
├── hooks/              # Feature-specific hooks
├── stores/             # State management
├── styles/             # Feature-specific styles
├── types.ts           # Feature-specific types
└── utils/             # Feature-specific utilities
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Code Style

The project uses ESLint and Prettier for code formatting and linting:

- ESLint enforces code quality rules
- Prettier ensures consistent code formatting
- Import order is enforced through ESLint rules
- Cross-feature imports are restricted to maintain modularity

## Best Practices

1. Feature-First Organization:
   - Keep feature-related code together
   - Avoid cross-feature dependencies
   - Share common code through the shared directory

2. Component Guidelines:
   - Use TypeScript for type safety
   - Follow React hooks best practices
   - Implement proper error boundaries
   - Use loading states appropriately

3. Styling:
   - CSS modules for component-specific styles
   - Theme variables for consistency
   - Responsive design principles

4. State Management:
   - Use React Context for feature-specific state
   - Keep state close to where it's used
   - Implement proper loading and error states

## Testing

TODO: Add testing guidelines and setup

## Contributing

1. Create a new branch for your feature/fix
2. Follow the existing code style
3. Add appropriate tests
4. Submit a pull request

## License

MIT
