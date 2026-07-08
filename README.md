![Portfolio Banner](readMeBanner.png)

# Professional Portfolio 🚀

Welcome to my professional portfolio! Visit [jckail.com](https://www.jckail.com) to see it in action.

## Overview 🎯

This portfolio is a modern, full-stack react web application showcasing my professional experience through an interactive and engaging interface. Built with performance, scalability, and user experience in mind.

## Key Features ✨

### Interactive Resume Experience
- 📝 Dynamic professional timeline with detailed experiences
- 🛠️ Comprehensive skills showcase with proficiency levels
- 📊 Project portfolio with live demos and descriptions
- 📄 Downloadable PDF resume

### Smart Interactions
- 🤖 AI-powered chat assistant (Claude Haiku 4.5) for portfolio navigation
- 🔍 Advanced search capabilities
- 📱 Responsive design for all devices
- 🌓 Light/Dark mode with system preference detection

### Professional Network
- 🔗 [LinkedIn](https://www.linkedin.com/in/jordan-kail)
- 💻 [GitHub](https://github.com/jkail-dev)
- 📧 Direct contact options
- 🌐 Professional social links

## Technology Stack 💻

### Frontend 🎨
- **React 18+** with TypeScript for robust UI development
- **Vite** for optimized development and building
- **React Router** for seamless navigation
- **CSS Modules** for scoped styling
- **Zustand** for state management
- **Custom Hooks** for shared logic

### Backend 🔧
- **FastAPI** for high-performance API endpoints
- **Python 3.12+** for modern language features
- **Pydantic** for data validation
- **Uvicorn** ASGI server
- **Anthropic Claude Haiku 4.5** for the streaming AI chat assistant
- **Custom Middleware** for security and logging

## Architecture 📂

```
portfolio/
├── frontend/           # React application
│   ├── src/
│   │   ├── app/       # Core application
│   │   ├── features/  # Feature modules
│   │   └── shared/    # Shared utilities
│   └── public/        # Static assets
│
├── backend/           # FastAPI server
│   ├── app/
│   │   ├── api/      # API routes
│   │   ├── models/   # Data models
│   │   └── utils/    # Helper functions
│   └── logs/         # Application logs
│
└── helpers/          # Deployment and utility scripts
```

## Getting Started 🚀

### Prerequisites
- Node.js 20+ and npm
- Python 3.12+
- Git

### Development Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/portfolio.git
   cd portfolio
   ```

2. Start the development environment:
   ```bash
   ./helpers/local_test.sh
   ```

3. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080
   - API Documentation: http://localhost:8080/docs

## Security Features 🔒

- CORS configuration
- Rate limiting
- Request validation
- Secure file operations
- Error handling

## Performance Optimizations ⚡

- Code splitting and lazy loading
- Memoized components
- Efficient data processing
- Resource optimization
- Proper caching strategies

## Development Guidelines 📝

### Code Quality
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Comprehensive testing suite
- Documentation requirements

### Best Practices
- Component-based architecture
- RESTful API design
- Proper error handling
- Performance monitoring

## Documentation 📚

For detailed technical information, refer to:
- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)
- API Documentation (available at `/docs` when running locally)

## Contributing 🤝

1. Follow existing architecture patterns
2. Maintain code quality standards
3. Write tests for new features
4. Update documentation
5. Submit pull requests for review
