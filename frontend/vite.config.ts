import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configure React plugin options
      include: "**/*.{jsx,tsx}",
      babel: {
        plugins: [
          ["@babel/plugin-transform-react-jsx", { "runtime": "automatic" }]
        ]
      }
    }),
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
    hmr: {
      overlay: true,
      // Explicitly set HMR connection
      protocol: 'ws',
      host: 'localhost',
    },
    // Optimize server settings
    watch: {
      usePolling: true,
      interval: 100,
    },
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
    // Force update on dependencies that might affect HMR
    force: true,
  },
  build: {
    // Improve build performance
    sourcemap: true,
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})
