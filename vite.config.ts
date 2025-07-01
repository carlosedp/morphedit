import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensure relative paths for Electron
  plugins: [react(), wasm(), topLevelAwait()],
  assetsInclude: ['**/*.wasm'],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Optimize chunk size and reduce file handles
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/system', '@mui/icons-material'],
        },
      },
      // Increase max parallel file reads to handle large dependency trees
      maxParallelFileOps: 5,
    },
  },
  optimizeDeps: {
    include: ['@mui/material', '@mui/system', '@mui/icons-material'],
  },
});
