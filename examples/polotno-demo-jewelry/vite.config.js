import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { renderProxy } from './render-proxy.js';

// Dedupe the libraries Polotno relies on so the bundle carries a single copy of
// each. Without this, konva can end up bundled twice ("Several Konva instances"
// → "No stage is found for element ..."), because both this app and polotno pull
// it in and the pnpm layout resolves them to different paths.
//
// The render proxy runs Replicate models server side with the token from
// .env.local, so it never reaches the browser.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), renderProxy(env.REPLICATE_API_TOKEN)],
    // localhost only: the render endpoint spends our Replicate credit.
    resolve: {
      dedupe: ['konva', 'react', 'react-dom', 'mobx', 'mobx-state-tree'],
    },
  };
});
