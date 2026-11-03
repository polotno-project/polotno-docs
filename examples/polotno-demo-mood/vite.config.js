import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { repaint } from './repaint-server.js';

// Dedupe the libraries Polotno relies on so the bundle carries a single copy of
// each. Without this, konva can end up bundled twice ("Several Konva instances"
// → "No stage is found for element ..."), because both this app and polotno pull
// it in and the pnpm layout resolves them to different paths.

// Layout mode posts hand-placed piece boxes here; they are merged into
// src/layout.json, which the scene reads at load.
const saveLayout = () => ({
  name: 'save-layout',
  configureServer(server) {
    server.middlewares.use('/__layout', (req, res) => {
      if (req.method !== 'POST') return res.end();
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const file = path.join(server.config.root, 'src/layout.json');
        const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
        fs.writeFileSync(file, JSON.stringify({ ...current, ...JSON.parse(body) }, null, 1) + '\n');
        res.end('ok');
      });
    });
  },
});

export default defineConfig({
  plugins: [react(), saveLayout(), repaint()],
  server: {
    host: true,
  },
  resolve: {
    dedupe: ['konva', 'react', 'react-dom', 'mobx'],
  },
});
