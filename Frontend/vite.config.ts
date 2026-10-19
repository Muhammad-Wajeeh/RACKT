import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  // This package is only imported lazily, so Vite would otherwise discover it mid-session
  // and force a full page reload. Pre-bundle it at startup instead.
  optimizeDeps: {
    include: ['@imgly/background-removal'],
  },
  // The background-removal worker uses dynamic imports, which need ES module workers.
  worker: {
    format: 'es',
  },
})
