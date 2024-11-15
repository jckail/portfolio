import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        svgoConfig: {
          plugins: [
            {
              name: 'removeAttrs',
              params: {
                attrs: ['bottomLeftOrigin', 'data-*']
              }
            },
            {
              name: 'prefixIds'
            }
          ]
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  logLevel: 'warn', // Only show warnings and errors
  assetsInclude: ['**/*.svg'],
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
