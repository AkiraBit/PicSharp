import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import 'dotenv/config';

const host = process.env.TAURI_DEV_HOST;
// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __PICSHARP_SIDECAR_SENTRY_DSN__: JSON.stringify(process.env.PICSHARP_SIDECAR_SENTRY_DSN),
    __PICSHARP_SENTRY_DSN__: JSON.stringify(process.env.PICSHARP_SENTRY_DSN),
    __PICSHARP_ABE_KEY__: JSON.stringify(process.env.PICSHARP_ABE_KEY),
  },
}));
