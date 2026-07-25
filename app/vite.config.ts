import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // The dataset is fetched at runtime, not bundled, so the JS chunk stays small and the browser can cache code and data independently.
    chunkSizeWarningLimit: 700,
  },
});
