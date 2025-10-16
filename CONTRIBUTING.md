# Contributing to ZCAM Gallery Plus

Thank you for your interest in contributing to ZCAM Gallery Plus! This guide will help you get started with development, understand our architecture, and ensure your contributions align with our standards.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Performance Guidelines](#performance-guidelines)
- [Documentation](#documentation)

## Getting Started

### Prerequisites

- **Node.js 18+** - Required for development
- **npm or yarn** - Package manager
- **Git** - Version control
- **VS Code** (recommended) - With TypeScript and React extensions
- **Z CAM camera** (optional) - For full functionality testing

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/zcam-gallery-plus.git
   cd zcam-gallery-plus
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/zohp/zcam-gallery-plus.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Development Scripts

```bash
# Start development server
npm run dev

# Start with Electron
npm run electron:dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### VS Code Configuration

Install recommended extensions:
```bash
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
```

## Architecture Overview

ZCAM Gallery Plus follows a clean architecture pattern with clear separation of concerns:

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── ipc/       # IPC handlers
│   └── index.ts   # Main process entry
├── preload/        # Electron preload scripts
├── renderer/       # React application
│   ├── components/ # UI components
│   │   ├── layout/     # Layout components
│   │   ├── gallery/    # Gallery components
│   │   ├── controls/   # Control components
│   │   ├── feedback/   # Feedback components
│   │   └── migration/  # Migration components
│   ├── hooks/      # Custom React hooks
│   ├── services/   # Business logic services
│   ├── stores/     # State management
│   ├── utils/      # Utility functions
│   └── types/      # TypeScript types
└── shared/         # Shared between processes
    └── types/      # Shared interfaces
```

### Key Principles

1. **Separation of Concerns**: UI, business logic, and data are clearly separated
2. **Type Safety**: Strict TypeScript with no `any` types
3. **Performance First**: Optimized for 60fps UI and minimal memory usage
4. **Testability**: All code is designed to be easily testable
5. **Maintainability**: Clear, documented, and well-structured code

## Code Standards

### TypeScript

- **Strict mode enabled** - No implicit any types
- **Explicit return types** for public methods
- **Interface over type** for object shapes
- **Generic constraints** where appropriate
- **No unused variables or imports**

```typescript
// ✅ Good
interface UserSettings {
  theme: 'light' | 'dark'
  autoIngest: boolean
}

function getUserSettings(): UserSettings {
  return {
    theme: 'dark',
    autoIngest: true,
  }
}

// ❌ Bad
const getUserSettings = () => {
  return {
    theme: 'dark',
    autoIngest: true,
  }
}
```

### React Components

- **Functional components only** - No class components
- **Custom hooks** for logic and state
- **Proper dependency arrays** in useEffect
- **Memoization** for expensive operations
- **Error boundaries** for fault tolerance

```typescript
// ✅ Good
const GalleryItem: React.FC<GalleryItemProps> = React.memo(({ item, onSelect }) => {
  const [isSelected, setIsSelected] = useState(false)
  
  const handleClick = useCallback(() => {
    setIsSelected(!isSelected)
    onSelect(item.id)
  }, [isSelected, item.id, onSelect])
  
  return (
    <div onClick={handleClick} className={styles.item}>
      {item.name}
    </div>
  )
})

// ❌ Bad
const GalleryItem = ({ item, onSelect }) => {
  return (
    <div onClick={() => onSelect(item.id)}>
      {item.name}
    </div>
  )
}
```

### CSS Modules

- **CSS Modules** for component styling
- **CSS Variables** for theming
- **Responsive design** with mobile-first approach
- **Accessibility** considerations

```css
/* ✅ Good */
.item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-background);
  border-radius: var(--border-radius);
  transition: background-color var(--transition-fast);
}

.item:hover {
  background-color: var(--color-background-hover);
}

/* ❌ Bad */
.item {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: #ffffff;
  border-radius: 4px;
}
```

### Error Handling

- **Custom error classes** for different error types
- **User-friendly error messages**
- **Graceful degradation** when possible
- **Error boundaries** for React components

```typescript
// ✅ Good
class ConnectionError extends Error {
  constructor(message: string, public code: string, public retryable: boolean) {
    super(message)
    this.name = 'ConnectionError'
  }
}

try {
  await connector.connect(ip)
} catch (error) {
  if (error instanceof ConnectionError && error.retryable) {
    // Show retry option
  } else {
    // Show error message
  }
}
```

## Pull Request Process

### Before Submitting

1. **Create a feature branch** from `dev`:
   ```bash
   git checkout dev
   git pull upstream dev
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our code standards

3. **Write tests** for new functionality:
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Run linting and type checking**:
   ```bash
   npm run lint
   npm run type-check
   ```

5. **Update documentation** if needed

### Pull Request Guidelines

1. **Clear title** describing the change
2. **Detailed description** of what was changed and why
3. **Link to related issues** if applicable
4. **Screenshots or videos** for UI changes
5. **Checklist** of completed tasks

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## Testing Requirements

### Test Coverage

- **Unit tests**: >90% coverage for services and utilities
- **Integration tests**: >80% coverage for components and features
- **E2E tests**: 100% coverage for critical user journeys

### Writing Tests

1. **Test the behavior, not implementation**
2. **Use descriptive test names**
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Mock external dependencies**
5. **Test error cases**

```typescript
// ✅ Good test
describe('ZCamConnector', () => {
  it('should connect successfully with valid IP address', async () => {
    // Arrange
    const connector = new ZCamConnector()
    const validIp = '192.168.1.100'
    
    // Act
    const result = await connector.connect(validIp)
    
    // Assert
    expect(result.success).toBe(true)
    expect(connector.isConnected()).toBe(true)
  })
})
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Performance Guidelines

### Performance Targets

- **60fps UI** with virtual scrolling for 10,000+ files
- **<200MB memory** usage with 1000 files loaded
- **<16ms frame times** for smooth interactions
- **<2s startup** time to interactive

### Performance Best Practices

1. **Use React.memo** for expensive components
2. **Use useMemo** for expensive calculations
3. **Use useCallback** for stable function references
4. **Implement virtual scrolling** for large lists
5. **Optimize images** and thumbnails
6. **Profile before optimizing**

```typescript
// ✅ Good - Memoized component
const ExpensiveComponent = React.memo(({ data, onUpdate }) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveOperation(item))
  }, [data])
  
  const handleUpdate = useCallback((id: string) => {
    onUpdate(id)
  }, [onUpdate])
  
  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onUpdate={handleUpdate} />
      ))}
    </div>
  )
})
```

### Performance Testing

```bash
# Run performance benchmarks
node scripts/performance-test.js

# Quick performance check
node scripts/performance-test.js --quick
```

## Documentation

### Code Documentation

- **JSDoc comments** for public APIs
- **README updates** for new features
- **Architecture documentation** for complex changes
- **API documentation** for new services

```typescript
/**
 * Manages file downloads with queue management and progress tracking.
 * 
 * @example
 * ```typescript
 * const transferService = new FileTransferService()
 * await transferService.downloadFile(file, destination)
 * ```
 */
class FileTransferService {
  /**
   * Downloads a file from the camera to the local destination.
   * 
   * @param file - The camera file to download
   * @param destination - Local path to save the file
   * @param options - Download options
   * @returns Promise that resolves when download completes
   */
  async downloadFile(
    file: CameraFile, 
    destination: string, 
    options?: FileTransferOptions
  ): Promise<void> {
    // Implementation
  }
}
```

### Commit Messages

Use semantic commit messages:

```bash
# Feature
git commit -m "feat: add virtual scrolling to gallery grid"

# Bug fix
git commit -m "fix: resolve memory leak in thumbnail cache"

# Documentation
git commit -m "docs: update API documentation for migration service"

# Performance
git commit -m "perf: optimize thumbnail loading with prefetching"

# Test
git commit -m "test: add unit tests for file transfer service"
```

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Code Review**: Ask questions in pull request reviews

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing to ZCAM Gallery Plus, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ZCAM Gallery Plus! 🚀
