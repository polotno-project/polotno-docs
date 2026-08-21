import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Honour PORT when something else already holds 5173.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
});
