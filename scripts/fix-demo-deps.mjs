import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = path.resolve(__dirname, '..', 'examples');

const PACKAGES = {
  '@blueprintjs/core': '^5.0.0',
  '@meronex/icons': '^1.0.0',
  'mobx': '^6.0.0',
  'react-konva': '^18.0.0',
  'react-konva-utils': '^1.0.0',
  'quill': '^2.0.0',
  'nanoid': '^3.3.11',
};

async function pathExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function getSourceFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules','dist','build','.codesandbox'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await getSourceFiles(full));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function findImports(source, pkg) {
  const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp("(?:from\\s+|require\\s*\\()\\s*['\"]" + escaped + "(?:/[^'\"]*)?['\"]").test(source);
}

async function main() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory() && e.name !== 'node_modules').map(e => e.name);
  let totalChanges = 0;

  for (const dir of dirs) {
    const demoDir = path.join(EXAMPLES_DIR, dir);
    const pkgPath = path.join(demoDir, 'package.json');
    if (!(await pathExists(pkgPath))) continue;

    const sourceFiles = await getSourceFiles(demoDir);
    const allSource = await Promise.all(sourceFiles.map(f => readFile(f, 'utf8')));
    const combined = allSource.join('\n');

    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    let changed = false;

    for (const [pkgName, version] of Object.entries(PACKAGES)) {
      if (allDeps[pkgName]) continue;
      if (!findImports(combined, pkgName)) continue;
      if (!pkg.dependencies) pkg.dependencies = {};
      pkg.dependencies[pkgName] = version;
      changed = true;
      console.log("  + " + dir + ": added " + pkgName + "@" + version);
    }

    if (changed) {
      pkg.dependencies = Object.fromEntries(
        Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b))
      );
      await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      totalChanges++;
    }
  }
  console.log("\nUpdated " + totalChanges + " package.json files.");
}

main().catch(err => { console.error(err); process.exitCode = 1; });
