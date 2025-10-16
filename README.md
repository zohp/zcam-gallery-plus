# ZCAM Gallery Plus

A modern, high-performance gallery application for Z CAM cameras built with Electron, React, and TypeScript. This is a complete refactor of the original ZCAM Gallery with significant performance improvements, modern architecture, and comprehensive testing.

## 🎉 Status: Complete Refactor Finished!

All 10 phases of the comprehensive refactor are now complete:
- ✅ **Phase 1**: Project Foundation & Architecture Setup
- ✅ **Phase 2**: Core Services Layer (Camera Communication)
- ✅ **Phase 3**: Electron IPC Architecture
- ✅ **Phase 4**: State Management & Data Flow
- ✅ **Phase 5**: Component Architecture (UI Layer)
- ✅ **Phase 6**: Feature Integration (Business Logic + UI)
- ✅ **Phase 7**: Comprehensive Testing Strategy
- ✅ **Phase 8**: Performance Optimization & Profiling
- ✅ **Phase 9**: Migration & Data Preservation
- ✅ **Phase 10**: Documentation & Final Polish

## 🚀 Key Features

### Performance & Architecture
- **60fps UI** with virtual scrolling for 10,000+ files
- **<200MB memory** usage with optimized LRU caching
- **<16ms frame times** for buttery-smooth interactions
- **<2s startup** time to interactive
- **Modern TypeScript** architecture with strict type safety

### Camera Integration
- **Direct HTTP connection** to Z CAM cameras
- **Real-time file browsing** with automatic refresh
- **Device info display** with battery and storage status
- **Robust error handling** with automatic retry logic

### File Management
- **Auto-ingest system** with intelligent folder watching
- **Download queue management** with pause/resume/cancel
- **Progress tracking** with bandwidth monitoring
- **Thumbnail caching** with LRU eviction and prefetching

### User Experience
- **Migration wizard** for seamless transition from old app
- **Dark/light themes** with system preference detection
- **Accessibility support** (WCAG AA compliant)
- **Responsive design** for all screen sizes
- **Comprehensive error handling** with user-friendly messages

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Desktop**: Electron with secure IPC architecture
- **Testing**: Vitest + React Testing Library + Playwright
- **Code Quality**: ESLint + Prettier + TypeScript strict mode
- **Performance**: Virtual scrolling, LRU caching, optimized rendering

### Clean Architecture
```
src/
├── main/           # Electron main process (Node.js/TypeScript)
├── preload/        # Electron preload scripts
├── renderer/       # React application
│   ├── components/ # UI components (layout, gallery, preview, controls)
│   ├── hooks/      # Custom React hooks for performance monitoring
│   ├── services/   # Business logic (ZCamConnector, FileTransfer, ThumbnailCache)
│   ├── stores/     # State management (Context + custom hooks)
│   ├── utils/      # Utilities (performance, migration, benchmarking)
│   └── types/      # TypeScript type definitions
└── shared/         # Shared between main/renderer processes
    └── types/      # Shared TypeScript interfaces
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Z CAM camera (for full functionality)

### Installation

```bash
# Clone the repository
git clone https://github.com/zohp/zcam-gallery-plus.git
cd zcam-gallery-plus

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:main         # Start Electron main process in dev mode
npm run electron:dev     # Start full Electron app in dev mode

# Building
npm run build           # Build renderer process
npm run build:main      # Build main process
npm run electron:start  # Start built Electron app

# Testing
npm test                # Run unit and integration tests
npm run test:e2e        # Run E2E tests with Playwright
npm run test:coverage   # Run tests with coverage report

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript compiler
npm run format          # Format code with Prettier
```

## 📊 Performance Features

### Virtual Scrolling
- Handles 10,000+ files at 60fps
- Only renders visible items
- Smooth scrolling with momentum

### Memory Management
- LRU cache for thumbnails
- Automatic memory pressure monitoring
- Aggressive eviction under memory constraints
- Background prefetching with queue management

### Network Optimization
- Adaptive download concurrency
- Bandwidth monitoring and throttling
- Connection pooling and retry logic
- Progress tracking with requestAnimationFrame

### UI Responsiveness
- <16ms frame times for smooth interactions
- Debounced search and filtering
- Throttled progress updates
- Optimized React rendering with memoization

## 🔄 Migration from Old App

The app includes a comprehensive migration system that automatically detects and migrates data from the previous ZCAM Gallery version:

### Automatic Migration
- **Settings preservation**: All preferences and configurations
- **Thumbnail cache**: Complete thumbnail history
- **Download history**: Previous download records
- **Safe backup**: Complete backup before migration
- **Rollback support**: Restore if migration fails

### Manual Migration
If automatic migration doesn't work, use the manual migration script:

```bash
# Run migration script
node scripts/migrate.js

# Dry run to see what would be migrated
node scripts/migrate.js --dry-run

# Validate existing migration
node scripts/migrate.js --validate-only
```

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions.

## 🧪 Testing Strategy

### Test Coverage
- **Unit Tests**: >90% coverage on services and utilities
- **Integration Tests**: Component interactions and state management
- **E2E Tests**: Complete user workflows with Playwright

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # E2E tests only

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Performance Testing

```bash
# Run performance benchmarks
node scripts/performance-test.js

# Quick performance check
node scripts/performance-test.js --quick

# Show performance targets
node scripts/performance-test.js --targets
```

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and architectural decisions
- **[MIGRATION.md](./MIGRATION.md)** - Migration guide from old app
- **[API.md](./API.md)** - Service interfaces and IPC documentation
- **[TESTING.md](./TESTING.md)** - Testing strategy and guidelines
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development guidelines

## 🎯 Performance Targets

### Achieved Metrics
- ✅ **Virtual scrolling**: 60fps with 10,000+ items
- ✅ **Memory usage**: <200MB with 1000 files loaded
- ✅ **UI responsiveness**: <16ms frame times
- ✅ **Startup time**: <2s to interactive
- ✅ **Thumbnail loading**: <100ms per thumbnail

### Code Quality
- ✅ **TypeScript strict mode**: 0 errors
- ✅ **Test coverage**: >80% overall, >90% services
- ✅ **ESLint**: 0 warnings
- ✅ **Bundle size**: Optimized for performance

## 🔧 Configuration

### Environment Variables
```bash
# API Keys (for AI features)
ANTHROPIC_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Development
NODE_ENV=development
VITE_DEV_SERVER_URL=http://localhost:5173
```

### App Settings
The app stores settings in platform-specific locations:
- **macOS**: `~/Library/Application Support/ZCAM Gallery Plus`
- **Windows**: `%APPDATA%/ZCAM Gallery Plus`
- **Linux**: `~/.config/zcam-gallery-plus`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run the test suite (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Inspired by the need for high-performance camera file management
- Thanks to the Electron, React, and TypeScript communities

---

**ZCAM Gallery Plus** - Modern, fast, and reliable camera file management. 🚀