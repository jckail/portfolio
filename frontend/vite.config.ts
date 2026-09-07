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
          // Same reasoning as MUI below: naming a chunk here forces it into
          // the initial graph. The engine is only reached through the lazy
          // particles-canvas boundary, so leave placement to the splitter.
          if (id.includes('tsparticles')) return undefined;
          if (id.includes('react-router')) return 'router';
          // MUI + Emotion are reachable only through the lazily-loaded chat.
          // Returning undefined leaves them to the automatic splitter, which
          // places them in the chat's own async chunk. The catch-all below
          // would otherwise force them into `vendor` — a chunk the entry
          // statically depends on, so they'd be modulepreloaded on first
          // paint and the chat's lazy boundary would buy nothing.
          //
          // DO NOT return a chunk NAME here (e.g. 'mui'). A previous attempt to
          // do exactly that produced a circular chunk dependency and a
          // production white screen — "Cannot access 'qt' before
          // initialization" — for every visitor (see CHANGELOG, Unreleased →
          // Fixed). Returning undefined is what makes this safe: Rollup keeps
          // the modules with their async importer instead of hoisting them into
          // a shared chunk that the entry then has to initialise. Verified with
          // a headless load of the built app in dark/light/chat/party modes.
          if (id.includes('@mui') || id.includes('@emotion')) return undefined;
          return 'vendor';
        },
      },
    },
  },
})
