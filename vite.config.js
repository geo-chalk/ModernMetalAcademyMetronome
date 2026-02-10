import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: command === 'build' ? '/ModernMetalAcademyMetronome/' : './',
  server: {
    watch: { usePolling: true },
    host: true,
    strictPort: true,
    port: 5173,
    hmr: { clientPort: 5173 },
  }
})