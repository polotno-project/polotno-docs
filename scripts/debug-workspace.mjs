import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');

async function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject({ code, stdout, stderr });
      }
    });
  });
}

async function validatePackageJson(demoDir, demoName) {
  try {
    const pkgPath = path.join(demoDir, 'package.json');
    const content = await readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(content);

    // Check for required fields
    if (!pkg.name) {
      return { valid: false, error: 'Missing name field' };
    }
    if (!pkg.version || pkg.version === '' || pkg.version === 'undefined') {
      return { valid: false, error: `Invalid version: "${pkg.version}"` };
    }

    // Check dependencies for empty versions
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [dep, version] of Object.entries(deps)) {
      if (!version || version === '' || version === 'undefined') {
        return {
          valid: false,
          error: `Invalid dependency version for ${dep}: "${version}"`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function testWorkspace(demos) {
  const testPkgPath = path.join(EXAMPLES_DIR, 'package.json.test');
  const originalPkgPath = path.join(EXAMPLES_DIR, 'package.json');

  // Create test package.json with limited workspaces
  const testPkg = {
    name: 'polotno-examples-workspace',
    version: '0.0.0',
    private: true,
    workspaces: demos,
    dependencies: {
      polotno: '2.32.1',
      react: '18.2.0',
      'react-dom': '18.2.0',
      'mobx-react-lite': '^4.0.0',
      escodegen: '^1.8.1',
    },
  };

  await writeFile(testPkgPath, JSON.stringify(testPkg, null, 2) + '\n');

  try {
    // Backup original
    const originalContent = await readFile(originalPkgPath, 'utf8');
    await writeFile(originalPkgPath + '.backup', originalContent);

    // Use test package.json
    await writeFile(originalPkgPath, JSON.stringify(testPkg, null, 2) + '\n');

    // Try npm install
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await runCommand(
      npmCmd,
      ['install', '--workspaces', '--include-workspace-root'],
      {
        cwd: EXAMPLES_DIR,
        env: process.env,
      }
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.stderr || error.stdout || error.message,
    };
  } finally {
    // Restore original
    try {
      const backupContent = await readFile(originalPkgPath + '.backup', 'utf8');
      await writeFile(originalPkgPath, backupContent);
      await unlink(originalPkgPath + '.backup');
    } catch {
      // Ignore cleanup errors
    }
    try {
      await unlink(testPkgPath);
    } catch {
      // Ignore
    }
  }
}

async function binarySearch(demos) {
  console.log(`Testing ${demos.length} demos...\n`);

  // First, validate all package.json files
  console.log('Validating package.json files...');
  const invalid = [];
  for (const demo of demos) {
    const demoDir = path.join(EXAMPLES_DIR, demo);
    const validation = await validatePackageJson(demoDir, demo);
    if (!validation.valid) {
      console.log(`✗ ${demo}: ${validation.error}`);
      invalid.push({ demo, error: validation.error });
    }
  }

  if (invalid.length > 0) {
    console.log(`\nFound ${invalid.length} invalid package.json files:`);
    invalid.forEach(({ demo, error }) => {
      console.log(`  - ${demo}: ${error}`);
    });
    return invalid;
  }

  console.log('✓ All package.json files are valid\n');

  // Find the breaking point
  let workingCount = 0;
  let problematic = [];

  // Find max working set
  for (let i = 1; i <= demos.length; i++) {
    const testDemos = demos.slice(0, i);
    console.log(
      `Testing with ${testDemos.length} demos (up to ${
        testDemos[testDemos.length - 1]
      })...`
    );
    const result = await testWorkspace(testDemos);

    if (!result.success) {
      const problematicDemo = testDemos[testDemos.length - 1];
      console.log(`✗ Failed! Problematic demo: ${problematicDemo}`);
      problematic.push(problematicDemo);

      // Test if this demo alone works
      console.log(`\nTesting ${problematicDemo} alone...`);
      const aloneResult = await testWorkspace([problematicDemo]);
      if (!aloneResult.success) {
        console.log(`✗ ${problematicDemo} fails even alone!`);
        console.log(`Error: ${aloneResult.error?.substring(0, 200)}...`);
      } else {
        console.log(`✓ ${problematicDemo} works alone - issue is combination`);
      }
      break;
    } else {
      console.log(`✓ Success with ${testDemos.length} demos\n`);
      workingCount = i;
    }
  }

  return { workingCount, problematic };
}

async function main() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  const demos = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      // Exclude workspace root and non-demo folders
      return name !== 'node_modules' && !name.startsWith('.');
    })
    .sort();

  console.log(`Found ${demos.length} demos\n`);

  const { workingCount, problematic } = await binarySearch(demos);

  if (problematic.length > 0) {
    console.log(`\n⚠️  Problematic demo found: ${problematic[0]}`);
    console.log(`✓ Working demos: ${workingCount}`);
    console.log(`\nTo exclude it, update examples/package.json workspaces to:`);
    console.log(
      `  "workspaces": [${demos
        .filter((d) => d !== problematic[0])
        .map((d) => `"${d}"`)
        .join(', ')}]`
    );
  } else {
    console.log(`\n✓ All ${demos.length} demos work!`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
