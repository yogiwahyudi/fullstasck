import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Browser hanya berbicara ke origin frontend; /api diteruskan ke Express (jaringan internal Compose).
const target = process.env.BACKEND_URL || 'http://localhost:3000';
const proxy = { '/api': { target, changeOrigin: true } };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173, proxy },
  preview: { host: true, port: 4173, proxy, allowedHosts: true },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.js' },
});
