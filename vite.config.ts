import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensure relative paths for Electron
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/rubberband-wasm/dist/rubberband.wasm',
          dest: '',
        },
      ],
    }),
  ],
  assetsInclude: ['**/*.wasm'],
});
