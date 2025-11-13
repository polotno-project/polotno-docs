import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');

async function testInstall(demos) {
  return new Promise((resolve) => {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['install', '--workspaces', '--include-workspace-root'], {
      cwd: EXAMPLES_DIR,
      stdio: 'pipe',
      env: { ...process.env, npm_config_loglevel: 'error' },
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      resolve({ success: code === 0, error: stderr });
    });
  });
}

async function main() {
  // Read current workspace config
  const pkgPath = path.join(EXAMPLES_DIR, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  const allDemos = pkg.workspaces || ['*'];

  console.log('Testing workspace install...\n');

  // Test current config
  const result = await testInstall(allDemos);
  
  if (result.success) {
    console.log('✓ Workspace install succeeds with current configuration');
    return;
  }

  console.log('✗ Workspace install fails\n');
  console.log('Error:', result.error.substring(0, 500));
  console.log('\nTrying to find problematic package...\n');

  // Get all demo directories
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  const demos = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== 'node_modules' && !name.startsWith('.'))
    .sort();

  // Test each demo individually
  const problematic = [];
  for (const demo of demos) {
    console.log(`Testing ${demo}...`);
    const testResult = await testInstall([demo]);
    if (!testResult.success) {
      console.log(`✗ ${demo} fails`);
      problematic.push(demo);
    } else {
      console.log(`✓ ${demo} works`);
    }
  }

  if (problematic.length > 0) {
    console.log(`\n⚠️  Problematic demos: ${problematic.join(', ')}`);
    console.log('\nTo exclude them, update examples/package.json:');
    const workingDemos = demos.filter(d => !problematic.includes(d));
    console.log(`  "workspaces": [${workingDemos.map(d => `"${d}"`).join(',\n    ')}]`);
  } else {
    console.log('\n✓ All demos work individually - issue is with combination');
    console.log('Try cleaning and reinstalling:');
    console.log('  cd examples && rm -rf node_modules package-lock.json && npm install');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

