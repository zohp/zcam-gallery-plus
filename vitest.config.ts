import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/renderer/components'),
      '@/features': resolve(__dirname, 'src/renderer/features'),
      '@/hooks': resolve(__dirname, 'src/renderer/hooks'),
      '@/services': resolve(__dirname, 'src/renderer/services'),
      '@/stores': resolve(__dirname, 'src/renderer/stores'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/utils': resolve(__dirname, 'src/renderer/utils'),
      '@/shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/release/'
      ]
    }
  }
})
