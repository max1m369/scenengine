import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  return {
    base: './', // Clean relative base for maximum compatibility
    build: {
      chunkSizeWarningLimit: 2000,
      outDir: 'dist',
      assetsDir: 'assets'
    },
    server: {
      port: 3000,
      open: true
    }
  };
});
