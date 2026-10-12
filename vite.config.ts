import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The proxy preserves x-test-namespace; no rewrite or replacement headers.
const proxy = { '/api': { target: 'http://127.0.0.1:3001' } };

export default defineConfig({
  root: 'apps/web',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
  build: { outDir: '../../dist/web', emptyOutDir: true }
});
