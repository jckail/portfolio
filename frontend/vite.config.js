import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Define the log file path
const logFilePath = path.resolve(__dirname, 'frontend.log');

// Delete the log file before each build
if (fs.existsSync(logFilePath)) {
  fs.unlinkSync(logFilePath);
}

// Load environment variables from .env file
const envFilePath = path.resolve(__dirname, '../.env');
const envConfig = fs.existsSync(envFilePath)
  ? Object.fromEntries(
      fs
        .readFileSync(envFilePath, 'utf-8')
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('=').map(part => part.trim()))
    )
  : {};

// Vite configuration
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
