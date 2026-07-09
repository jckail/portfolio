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
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Proxy the chat assistant WebSocket to the FastAPI backend
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  logLevel: 'warn', // Only show warnings and errors
  assetsInclude: ['**/*.svg'],
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    // Skip sourcemaps in production builds: faster builds and a much
    // smaller dist/ (which is baked into the Docker image).
    sourcemap: false,
    // Skip gzip-size reporting to speed up CI builds.
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // MUI is only used by the lazily-loaded chat portal, so keep it
          // out of the eagerly-loaded vendor chunk.
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (id.includes('tsparticles')) return 'particles';
          if (id.includes('react-router')) return 'router';
          return 'vendor';
        },
      },
    },
  },
})
