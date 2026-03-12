/**
 * Migration script: Convert all CRA demos to Vite.
 *
 * For each demo with react-scripts:
 * 1. Update package.json: remove react-scripts, add vite + @vitejs/plugin-react, change scripts, add "type": "module"
 * 2. Move public/index.html -> index.html (root), adapt for Vite (remove %PUBLIC_URL%, add <script type="module">)
 * 3. Rename src/index.js -> src/index.jsx (if it contains JSX)
 * 4. Add vite.config.js
 * 5. Add .codesandbox/tasks.json
 * 6. Add .npmrc
 * 7. Remove public/ folder (if only index.html was in it)
 */

import { readdir, readFile, writeFile, mkdir, rm, stat, rename, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXAMPLES_DIR = path.resolve(__dirname, '..', 'examples');

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
});
`;

const CODESANDBOX_TASKS = `{
  "$schema": "https://codesandbox.io/schemas/tasks.json",
  "setupTasks": ["npm install"],
  "tasks": {
    "dev": {
      "name": "Dev Server",
      "command": "npm run dev",
      "runAtStart": true,
      "preview": {
        "port": 5173
      }
    }
  }
}
`;

const NPMRC = `workspaces=false\n`;

async function pathExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function readdirSafe(p) {
  try { return await readdir(p); } catch { return []; }
}

function adaptHtml(html, entryFile) {
  // Remove %PUBLIC_URL%/ references
  html = html.replace(/%PUBLIC_URL%\//g, '/');

  // Remove CRA comments block
  html = html.replace(/\s*<!--\s*\n\s*This HTML file is a template[\s\S]*?-->\s*\n/g, '\n');

  // Add Vite entry script before </body>
  if (!html.includes('<script type="module"')) {
    html = html.replace(
      '</body>',
      `    <script type="module" src="/${entryFile}"></script>\n  </body>`
    );
  }

  return html;
}

async function migrate(demoName) {
  const demoDir = path.join(EXAMPLES_DIR, demoName);
  const pkgPath = path.join(demoDir, 'package.json');

  if (!(await pathExists(pkgPath))) return null;

  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (!deps['react-scripts']) return null;

  console.log(`Migrating ${demoName}...`);

  // --- 1. Determine entry file ---
  let entryFile = 'src/index.js';
  let entryExt = '.js';
  if (await pathExists(path.join(demoDir, 'src', 'index.tsx'))) {
    entryFile = 'src/index.tsx';
    entryExt = '.tsx';
  } else if (await pathExists(path.join(demoDir, 'src', 'index.js'))) {
    // Check if it contains JSX - if so, rename to .jsx
    const content = await readFile(path.join(demoDir, 'src', 'index.js'), 'utf8');
    if (content.includes('<') && (content.includes('/>') || content.includes('</'))) {
      await rename(
        path.join(demoDir, 'src', 'index.js'),
        path.join(demoDir, 'src', 'index.jsx')
      );
      entryFile = 'src/index.jsx';
      entryExt = '.jsx';
    }
  }

  // --- 2. Move and adapt index.html ---
  const publicHtml = path.join(demoDir, 'public', 'index.html');
  if (await pathExists(publicHtml)) {
    let html = await readFile(publicHtml, 'utf8');
    html = adaptHtml(html, entryFile);
    await writeFile(path.join(demoDir, 'index.html'), html);

    // Remove public/ if it only had index.html (and maybe favicon.ico)
    const publicFiles = await readdirSafe(path.join(demoDir, 'public'));
    const nonTrivial = publicFiles.filter(f => f !== 'index.html' && f !== 'favicon.ico' && f !== '.DS_Store');
    if (nonTrivial.length === 0) {
      await rm(path.join(demoDir, 'public'), { recursive: true, force: true });
    } else {
      // Keep public/ but remove the old index.html
      await rm(publicHtml, { force: true });
    }
  }

  // --- 3. Update package.json ---
  // Remove react-scripts and typescript (CRA dep)
  delete pkg.dependencies['react-scripts'];
  if (pkg.devDependencies) {
    delete pkg.devDependencies['react-scripts'];
    delete pkg.devDependencies['typescript'];
  }

  // Remove browserslist
  delete pkg.browserslist;

  // Remove "main" field (CRA artifact)
  delete pkg.main;

  // Add type: module
  pkg.type = 'module';

  // Replace scripts
  pkg.scripts = {
    dev: 'vite',
    start: 'vite',
    build: 'vite build',
    preview: 'vite preview',
  };

  // Add vite devDependencies
  if (!pkg.devDependencies) pkg.devDependencies = {};
  pkg.devDependencies['@vitejs/plugin-react'] = '^5';
  pkg.devDependencies['vite'] = '^7';

  // Keep typescript for .tsx projects
  if (entryExt === '.tsx') {
    pkg.devDependencies['typescript'] = '^5';
  }

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // --- 4. Add vite.config.js ---
  await writeFile(path.join(demoDir, 'vite.config.js'), VITE_CONFIG);

  // --- 5. Add .codesandbox/tasks.json ---
  await mkdir(path.join(demoDir, '.codesandbox'), { recursive: true });
  await writeFile(path.join(demoDir, '.codesandbox', 'tasks.json'), CODESANDBOX_TASKS);

  // --- 6. Add .npmrc ---
  await writeFile(path.join(demoDir, '.npmrc'), NPMRC);

  // --- 7. Clean up CRA artifacts ---
  for (const f of ['src/setupTests.js', 'src/reportWebVitals.js', 'src/App.test.js']) {
    const fp = path.join(demoDir, f);
    if (await pathExists(fp)) await rm(fp);
  }

  console.log(`  ✔ ${demoName} migrated (entry: ${entryFile})`);
  return demoName;
}

async function main() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  const results = [];
  for (const dir of dirs) {
    const result = await migrate(dir);
    if (result) results.push(result);
  }

  console.log(`\nMigrated ${results.length} demos.`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
