import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Note the curly braces around { command } below
export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    // Now 'command' will correctly be 'build' or 'serve'
    base: command === 'build' ? '/ModernMetalAcademyMetronome/' : './',
    server: {
      watch: { usePolling: true },
      host: true,
      strictPort: true,
      port: 5173,
      hmr: { clientPort: 5173 },
    }
  }
})