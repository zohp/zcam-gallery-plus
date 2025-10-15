import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  interface Assertion<T = any> extends jest.Matchers<void, T> {}
  interface AsymmetricMatchersContaining extends jest.Matchers<void, any> {}
}

declare module '@testing-library/jest-dom/matchers' {
  interface TestingLibraryMatchers<T, R> extends jest.Matchers<void, T> {}
}
