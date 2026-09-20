import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // Bundle dependencies so the function uses one React instance and does not
  // depend on Vercel tracing Vite-generated external package imports.
  ssr: { noExternal: true },
  build: { ssr: 'src/entry-server.tsx', outDir: 'ssr-build', sourcemap: true },
});
