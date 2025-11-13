import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');

async function fixPackageNames() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  const demos = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  let fixed = 0;
  let skipped = 0;

  for (const demoName of demos) {
    const demoDir = path.join(EXAMPLES_DIR, demoName);
    const pkgPath = path.join(demoDir, 'package.json');

    try {
      const pkgContent = await readFile(pkgPath, 'utf8');
      const pkgJson = JSON.parse(pkgContent);

      // Use directory name as package name (scoped to avoid conflicts)
      const expectedName = `@polotno-docs/${demoName}`;

      if (pkgJson.name === expectedName) {
        skipped++;
        continue;
      }

      pkgJson.name = expectedName;
      const updatedContent = JSON.stringify(pkgJson, null, 2) + '\n';
      await writeFile(pkgPath, updatedContent, 'utf8');
      console.log(`✓ ${demoName}: ${pkgJson.name || 'unnamed'} → ${expectedName}`);
      fixed++;
    } catch (error) {
      if (error.code === 'ENOENT') {
        skipped++;
        continue;
      }
      console.error(`✗ ${demoName}: ${error.message}`);
    }
  }

  console.log(`\nFixed: ${fixed}, Skipped: ${skipped}`);
}

fixPackageNames().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

