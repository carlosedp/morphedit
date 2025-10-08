import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './', // Ensure relative paths for Electron
  define: {
    // Define Node.js globals for browser compatibility
    'process.env': {},
    global: 'globalThis',
  },
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
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
          mui: ['@mui/material', '@mui/system', '@mui/icons-material'],
          audio: ['wavesurfer.js', 'web-audio-beat-detector'],
          // essentia will be dynamically imported, not in initial bundle
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
    include: ['@mui/material', '@mui/system', '@mui/icons-material'],
    // Pre-bundle these for faster dev server startup
    exclude: ['essentia.js'], // Exclude essentia from pre-bundling since it's lazy-loaded
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
}));
