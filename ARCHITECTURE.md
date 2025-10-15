# ZCAM Gallery Plus - Architecture Documentation

## Overview

This document describes the architecture of ZCAM Gallery Plus, a modern Electron application built with TypeScript and React for managing Z CAM camera files.

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Desktop**: Electron 28
- **Build**: Vite
- **Testing**: Vitest + React Testing Library + Playwright
- **State Management**: React Context + Custom Hooks
- **Styling**: CSS Modules with CSS Variables
- **Type Safety**: TypeScript strict mode

## Project Structure

```
src/
├── main/           # Electron main process (Node.js/TypeScript)
├── preload/        # Electron preload scripts
├── renderer/       # React application
│   ├── components/ # UI components
│   ├── features/   # Feature-based modules
│   ├── hooks/      # Custom React hooks
│   ├── services/   # Business logic services
│   ├── stores/     # State management (Context providers)
│   ├── types/      # TypeScript type definitions
│   └── utils/      # Utility functions
└── shared/         # Shared between main/renderer
    └── types/      # Shared TypeScript types
```

## Architecture Principles

### 1. Separation of Concerns

- **Services**: Pure business logic, framework-agnostic
- **Components**: UI presentation only
- **Hooks**: State management and side effects
- **Types**: Shared type definitions across layers

### 2. Dependency Injection

Services are injected through React Context to enable:
- Easy testing with mocks
- Loose coupling between components
- Clear dependency graph

### 3. Type Safety

- Strict TypeScript configuration
- No `any` types allowed
- Shared interfaces between main and renderer processes
- Runtime type validation where needed

### 4. Performance First

- Virtual scrolling for large lists
- Lazy loading with Intersection Observer
- Memoization of expensive computations
- Throttled progress updates
- Efficient re-render prevention

## Layer Architecture

### 1. Electron Layer

**Main Process** (`src/main/`)
- Window management
- File system operations
- IPC handlers
- Security boundaries

**Preload Scripts** (`src/preload/`)
- Secure bridge between main and renderer
- Type-safe API exposure
- Input validation

### 2. Services Layer

**Camera Services**
- `ZCamConnector`: HTTP communication with Z CAM
- `FileTransferService`: Download management with queue
- `ThumbnailCache`: LRU cache for thumbnails

**Design Pattern**: Service objects with dependency injection

```typescript
interface IZCamConnector {
  connect(ip: string): Promise<ConnectionResult>
  listFiles(path: string): Promise<CameraFile[]>
  // ... other methods
}
```

### 3. State Management Layer

**Context Providers**
- `ConnectionContext`: Camera connection state
- `GalleryContext`: File browser state
- `TransferContext`: Download progress state
- `SettingsContext`: User preferences

**Custom Hooks**
- `useConnection()`: Connection management
- `useGallery()`: File browser logic
- `useTransfers()`: Download management
- `useSettings()`: Settings persistence

### 4. Component Layer

**Component Categories**
- Layout: `AppShell`, `Toolbar`
- Gallery: `GalleryGrid`, `GalleryItem`, `ThumbnailImage`
- Controls: `ConnectionButton`, `AutoIngestToggle`
- Feedback: `LoadingSpinner`, `ProgressBar`, `Toast`

**Performance Optimizations**
- `React.memo` for pure components
- Virtual scrolling for large lists
- Lazy loading for images
- Code splitting for heavy components

## Data Flow

### 1. User Interaction Flow

```
User Action → Component → Hook → Service → Electron API → Camera
                ↓
User Interface ← Context ← Service Response ← Electron Response ← Camera Response
```

### 2. State Updates

- **Synchronous**: Direct context updates for UI state
- **Asynchronous**: Service calls with loading states
- **Batched**: Multiple updates combined to prevent excessive re-renders

### 3. Error Handling

- Service level: Retry logic and error recovery
- Hook level: Error boundaries and user feedback
- Component level: Graceful degradation

## Security Considerations

### 1. Electron Security

- Context isolation enabled
- Node integration disabled in renderer
- CSP (Content Security Policy) headers
- Path validation for all file operations

### 2. Network Security

- Input validation for camera IP addresses
- Timeout handling for network requests
- Secure file download with progress tracking

### 3. File System Security

- Whitelisted file operations only
- Path traversal prevention
- Safe file extension validation

## Performance Strategy

### 1. Render Performance

**Target**: <16ms per frame (60fps)

**Optimizations**:
- Virtual scrolling for gallery grid
- Memoized components and computations
- Debounced user inputs
- Efficient state updates

### 2. Memory Management

**Target**: <200MB for 1000 files

**Optimizations**:
- LRU cache for thumbnails
- Cleanup of completed transfers
- Lazy loading of images
- IndexedDB for large datasets

### 3. Network Optimization

**Target**: Saturate available bandwidth

**Optimizations**:
- Concurrent downloads (2-4)
- Connection pooling
- Chunk size optimization
- Progress throttling

## Testing Strategy

### 1. Unit Tests (Vitest)

- **Services**: 90%+ coverage
- **Hooks**: All state transitions
- **Utils**: 100% coverage
- **Components**: Props and callbacks

### 2. Integration Tests (React Testing Library)

- **Features**: Complete user flows
- **Context**: State interactions
- **IPC**: Mock Electron APIs

### 3. E2E Tests (Playwright)

- **Critical Paths**: Connect → Browse → Download
- **Auto-Ingest**: Enable → New file appears
- **Error Recovery**: Network failure → Retry

## Development Workflow

### 1. Local Development

```bash
npm run dev          # Start renderer and main processes
npm run dev:renderer # Renderer only (for UI development)
npm run dev:main     # Main process only (for backend development)
```

### 2. Testing

```bash
npm run test         # Unit tests
npm run test:ui      # Vitest UI
npm run test:e2e     # E2E tests
npm run test:coverage # Coverage report
```

### 3. Building

```bash
npm run build        # Build for development
npm run build:app    # Build distributable app
```

## Future Considerations

### 1. Scalability

- Service worker for background processing
- IndexedDB for offline capabilities
- Web Workers for heavy computations

### 2. Extensibility

- Plugin architecture for new camera support
- Theme system for UI customization
- Export/import for settings and data

### 3. Performance

- WebGL for image processing
- WASM for file parsing
- Streaming for large file transfers

## Decision Records

### 1. State Management Choice

**Decision**: React Context + Custom Hooks over Redux/Zustand

**Rationale**: 
- Simpler mental model
- Less boilerplate
- Better TypeScript integration
- Sufficient for current complexity

**Review**: Evaluate if complexity grows beyond 5 contexts

### 2. Testing Strategy

**Decision**: Vitest over Jest

**Rationale**:
- Faster execution
- Better Vite integration
- Modern ES modules support
- Smaller bundle size

### 3. Styling Approach

**Decision**: CSS Modules over Tailwind

**Rationale**:
- Better component isolation
- Easier theme management
- No build-time dependencies
- Better performance

## Code Standards

### 1. TypeScript

- Strict mode enabled
- No `any` types
- Explicit return types for public APIs
- Interface over type for object shapes

### 2. React

- Functional components only
- Custom hooks for logic
- Proper dependency arrays
- Error boundaries for fault tolerance

### 3. Testing

- AAA pattern (Arrange, Act, Assert)
- Descriptive test names
- Mock external dependencies
- Test behavior, not implementation

### 4. Performance

- Profile before optimizing
- Measure, don't guess
- Use React DevTools Profiler
- Monitor bundle size
