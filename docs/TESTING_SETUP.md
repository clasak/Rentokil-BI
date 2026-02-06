# Testing Setup Guide

## Current Status

**No testing framework is currently configured.** This document provides complete setup instructions and test files for implementing automated integration tests.

## Recommended Stack

- **Vitest**: Fast, modern test runner with native ESM support
- **React Testing Library**: Component testing with user-centric queries
- **MSW (Mock Service Worker)**: API mocking for integration tests

## Installation

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
```

## Configuration Files

### 1. Vitest Config (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/app/**/layout.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 2. Test Setup File (`src/test/setup.ts`)

```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any
```

### 3. Update package.json scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Test File Location

Tests are located alongside the code they test:

```
src/
  hooks/
    useBigQueryData.ts
    __tests__/
      useBigQueryData.test.tsx
  components/
    MyComponent.tsx
    __tests__/
      MyComponent.test.tsx
```

## Running Tests

```bash
npm test              # Watch mode
npm run test:ui       # Interactive UI
npm run test:run      # Single run (CI)
npm run test:coverage # Coverage report
```

## Test File Created

See [`/src/hooks/__tests__/useBigQueryData.test.tsx`](../src/hooks/__tests__/useBigQueryData.test.tsx) for the complete integration test suite.

## Test Coverage Goals

- **Error Handling**: Verify error state returned when API fails
- **Empty State**: Verify defaultData returned on empty response
- **Transform**: Verify transformBigQueryData called correctly
- **Filter Injection**: Verify includeOrgFilters adds market/region/branch
- **Role Filters**: Verify includeRoleFilters adds user-specific filters
- **Refetch**: Verify refetch() triggers new API call
- **Loading State**: Verify isLoading transitions correctly

## CI Integration

For GitHub Actions, add `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [main, alpha-test]
  pull_request:
    branches: [main, alpha-test]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Future Enhancements

1. **E2E Tests**: Add Playwright for end-to-end testing
2. **Visual Regression**: Add Chromatic or Percy for UI testing
3. **Performance**: Add Lighthouse CI for performance budgets
4. **Accessibility**: Add axe-core for a11y testing
