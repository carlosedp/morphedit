import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

import { perfLogger } from './vite-plugin-perf-logger';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './', // Ensure relative paths for Electron
  // Optimize source maps for dev mode (Firefox performance)
  ...(mode === 'development' && {
    css: {
      devSourcemap: false, // Disable CSS source maps in dev for Firefox
    },
    esbuild: {
      sourcemap: false, // Disable inline source maps for faster Firefox loading
      target: 'esnext', // Don't transpile modern features
      keepNames: false, // Reduce size
      legalComments: 'none', // Remove comments
    },
  }),
  define: {
    // Define Node.js globals for browser compatibility
    'process.env': {},
    global: 'globalThis',
  },
  plugins: [
    react({
      // Optimize React refresh for Firefox
      babel: {
        compact: true, // Reduce bundle size
        babelrc: false,
        configFile: false,
      },
      // Skip type checking in dev for faster HMR
      jsxRuntime: 'automatic',
    }),
    wasm(),
    topLevelAwait(),
    // Performance logging plugin (dev only)
    perfLogger({ threshold: 500 }), // Log requests > 500ms
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        globIgnores: ['**/stats.html'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit (increased for essentia.js)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'MorphEdit - Audio Reel Editor',
        short_name: 'MorphEdit',
        description:
          'A desktop application for creating audio reels, samples and editing.',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    // Bundle analyzer - only in analyze mode
    mode === 'analyze' &&
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
  ].filter(Boolean),
  assetsInclude: ['**/*.wasm'],
  server: {
    // Optimize dev server for Firefox performance
    hmr: {
      overlay: true,
      timeout: 30000, // Increase timeout for slow connections
    },
    // Pre-transform known slow modules
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/Waveform.tsx',
        './src/components/*.tsx',
      ],
    },
    // Increase middleware timeout for slow transformations
    middlewareMode: false,
    // Force IPv4 (can be faster on some systems)
    host: '127.0.0.1',
    // Optimize watch
    watch: {
      usePolling: false,
      interval: 1000,
    },
    // Configure headers for better caching in dev
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@package': '/package.json',
      '@constants': '/src/constants.ts',
      '@/components': '/src/components',
      '@/hooks': '/src/hooks',
      '@/utils': '/src/utils',
      '@/stores': '/src/stores',
      '@/types': '/src/types',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (but not inline)
    sourcemap: false,
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'], // Remove specific console calls
      },
    },
    rollupOptions: {
      // Optimize chunk size and reduce file handles
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/system'],
          audio: ['wavesurfer.js', 'web-audio-beat-detector'],
          // essentia will be dynamically imported, not in initial bundle
          // @mui/icons-material uses direct imports, so icons are tree-shaken automatically
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // Increase max parallel file reads to handle large dependency trees
      maxParallelFileOps: 5,
    },
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/system',
      'react',
      'react-dom',
      'react-is',
      'react/jsx-runtime',
      'prop-types',
      'hoist-non-react-statics',
      // Pre-bundle more dependencies to reduce server processing time
      'wavesurfer.js',
      'wavesurfer.js/dist/plugins/regions.esm.js',
      '@mui/material/styles',
      '@mui/material/Button',
      '@mui/material/Box',
      '@mui/material/Typography',
    ],
    // Pre-bundle these for faster dev server startup
    exclude: [
      'essentia.js', // Exclude essentia from pre-bundling since it's lazy-loaded
      '@mui/icons-material', // Use direct imports to avoid bundling all icons
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      // Handle CommonJS modules properly
      mainFields: ['module', 'main'],
      // Increase target to reduce transformation work
      target: 'esnext',
    },
    force: true, // Force dependency pre-bundling on server start
    // Enable more aggressive caching
    holdUntilCrawlEnd: false,
  },
}));
