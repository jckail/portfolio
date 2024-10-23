import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Enable access from network
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true
    }
  }
})
