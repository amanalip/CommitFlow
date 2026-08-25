import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'global': 'globalThis',
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@xyflow') || id.includes('d3-')) return 'graph-vendor';
          if (id.includes('@xterm')) return 'terminal-vendor';
          if (id.includes('isomorphic-git') || id.includes('lightning-fs')) return 'git-vendor';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
});
