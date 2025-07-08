import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './', // Ensure relative paths for Electron
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        globIgnores: ['**/stats.html'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB limit
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
      '@/components': '/src/components',
      '@/hooks': '/src/hooks',
      '@/utils': '/src/utils',
      '@/stores': '/src/stores',
      '@/types': '/src/types',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Optimize chunk size and reduce file handles
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/system', '@mui/icons-material'],
          audio: ['wavesurfer.js', 'web-audio-beat-detector'],
        },
      },
      // Increase max parallel file reads to handle large dependency trees
      maxParallelFileOps: 5,
    },
  },
  optimizeDeps: {
    include: ['@mui/material', '@mui/system', '@mui/icons-material'],
  },
}));
