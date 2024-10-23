import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const envFilePath = path.resolve(__dirname, '../.env')
const envConfig = fs.existsSync(envFilePath) ? Object.fromEntries(
  fs.readFileSync(envFilePath, 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=').map(part => part.trim()))
) : {}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  },
  define: {
    'process.env': envConfig
  }
})
