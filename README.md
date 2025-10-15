# ZCAM Gallery Plus

A modern, clean architecture implementation of the Z CAM Gallery application built with TypeScript, React, and Electron.

## 🚧 Status: Phase 1 Complete

This project is currently under development following a comprehensive refactor plan. Phase 1 (Project Foundation & Architecture Setup) is complete.

### What's Done ✅

- TypeScript project with strict configuration
- Vite + Electron build system
- Testing infrastructure (Vitest + React Testing Library + Playwright)
- Clean folder structure with separation of concerns
- State management with React Context + Custom Hooks
- CSS Modules with theme support
- ESLint + Prettier configuration
- Architecture documentation

### What's Next 🔄

- Phase 2: Core Services Layer (Camera Communication)
- Phase 3: Electron IPC Architecture  
- Phase 4: State Management & Data Flow
- Phase 5: Component Architecture (UI Layer)

## 🏗️ Architecture

This application follows a clean architecture pattern with clear separation between:

- **Services**: Pure business logic (framework-agnostic)
- **Components**: UI presentation only
- **Hooks**: State management and side effects
- **Types**: Shared type definitions across layers

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zcam-gallery-plus

# Install dependencies
npm install
```

### Development

```bash
# Start development server (renderer + main process)
npm run dev

# Start renderer only (for UI development)
npm run dev:renderer

# Start main process only (for backend development)
npm run dev:main
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Building

```bash
# Build for development
npm run build

# Build distributable app
npm run build:app
```

## 📁 Project Structure

```
src/
├── main/           # Electron main process
├── preload/        # Electron preload scripts
├── renderer/       # React application
│   ├── components/ # UI components
│   ├── features/   # Feature-based modules
│   ├── hooks/      # Custom React hooks
│   ├── services/   # Business logic services
│   ├── stores/     # State management
│   ├── types/      # TypeScript types
│   └── utils/      # Utility functions
└── shared/         # Shared between main/renderer
    └── types/      # Shared TypeScript types
```

## 🎯 Goals

This refactor aims to deliver:

- **Performance**: 60fps UI with virtual scrolling
- **Maintainability**: Clean architecture with clear separation of concerns
- **Type Safety**: Strict TypeScript with no `any` types
- **Testing**: Comprehensive test coverage (>80%)
- **User Experience**: Responsive, accessible, and intuitive interface

## 📊 Performance Targets

- Virtual scrolling: 60fps with 10,000 items
- Thumbnail loading: <100ms per thumbnail
- UI interactions: <16ms response time
- Memory: <200MB with 1000 files loaded
- Startup: <2s to interactive

## 🧪 Testing Strategy

- **Unit Tests**: Services, hooks, and utilities
- **Integration Tests**: Complete user flows
- **E2E Tests**: Critical paths with Playwright

## 🔧 Development Tools

- **TypeScript**: Strict mode with comprehensive types
- **Vite**: Fast build tool with HMR
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Vitest**: Fast unit testing
- **Playwright**: E2E testing

## 📝 Code Standards

- Functional components only
- Custom hooks for logic
- Proper dependency arrays
- Error boundaries for fault tolerance
- Profile before optimizing
- Measure, don't guess

## 🤝 Contributing

1. Follow the established architecture patterns
2. Write tests for new features
3. Ensure TypeScript strict mode compliance
4. Use semantic commit messages
5. Update documentation as needed

## 📄 License

MIT License - see LICENSE file for details.

---

**Note**: This is a complete rewrite from the original application. The old codebase is preserved for reference during migration.