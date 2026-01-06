import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    host: '0.0.0.0', // Allow access from network
    port: 5173,
    cors: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'chunk-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'app.css';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});

