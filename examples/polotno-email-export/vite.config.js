import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// @polotno/email-export installs its browser raster with a side-effect import
// (lib/browser-platform.js). Rolldown does not match the package's
// `sideEffects` entries, so a production build drops that import and every
// export throws "no raster platform installed". This marks the package's own
// modules as having side effects when they are resolved, which wins over
// package.json.
const EMAIL_EXPORT_LIB = /[\\/]@polotno[\\/]email-export[\\/]lib[\\/]/;
const keepEmailExportSideEffects = {
  name: 'keep-email-export-side-effects',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (!source.includes('email-export') && !(importer && EMAIL_EXPORT_LIB.test(importer))) return null;
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    return resolved && EMAIL_EXPORT_LIB.test(resolved.id) ? { ...resolved, moduleSideEffects: true } : null;
  },
};

// Dedupe the libraries Polotno relies on so the bundle carries a single copy of
// each. Without this, konva can end up bundled twice ("Several Konva instances"
// → "No stage is found for element ..."), because both this app and polotno pull
// it in and the pnpm layout resolves them to different paths.
export default defineConfig({
  plugins: [react(), keepEmailExportSideEffects],
  // "Send test email" posts to the website's /api/demo/email-test. On
  // polotno.com that is the same origin; in development, run the website on :3000.
  server: { host: true, proxy: { '/api': 'http://localhost:3000' } },
  resolve: {
    dedupe: ['konva', 'react', 'react-dom', 'mobx', 'mobx-state-tree'],
  },
});
