import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
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
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
