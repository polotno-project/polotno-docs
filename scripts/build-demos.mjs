import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { spawn, execSync } from 'node:child_process';
import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
const NEXT_PUBLIC_DIR = path.join(REPO_ROOT, 'public', 'docs', 'examples');
const BUILD_ARTIFACT_DIRS = ['dist', 'build', 'out'];

// Detect package manager
async function detectPackageManager(examplesDir) {
  const pnpmWorkspace = path.join(examplesDir, 'pnpm-workspace.yaml');
  const hasPnpmWorkspace = await pathExists(pnpmWorkspace);

  if (hasPnpmWorkspace) {
    // Check if pnpm is available
    try {
      execSync('pnpm --version', { stdio: 'ignore' });
      return {
        cmd: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
        name: 'pnpm',
        installArgs: ['install'],
        workspaceInstallArgs: ['install'],
      };
    } catch {
      // pnpm not available, fall back to npm
    }
  }

  return {
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    name: 'npm',
    installArgs: ['install', '--no-audit', '--fund=false'],
    workspaceInstallArgs: [
      'install',
      '--workspaces',
      '--include-workspace-root',
    ],
  };
}

let pkgManager = null;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'; // fallback

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
const optionArgs = Object.fromEntries(
  argv
    .filter((arg) => arg.startsWith('--') && arg.includes('='))
    .map((arg) => {
      const [key, value] = arg.split('=');
      return [key, value];
    })
);

const skipInstall = flags.has('--skip-install');
const cleanOutput = flags.has('--clean');
const filterArg = optionArgs['--filter'];
const filterRegex = filterArg ? new RegExp(filterArg) : null;
const concurrencyArg = optionArgs['--concurrency'];
const concurrency = concurrencyArg ? parseInt(concurrencyArg, 10) : 4;
let workspaceMode = false;

// Concurrency limiter
class ConcurrencyLimiter {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async run(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

function prettyDuration(start) {
  const diff = Date.now() - start;
  const seconds = Math.round(diff / 100) / 10;
  return `${seconds.toFixed(1)}s`;
}

async function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${command} ${args.join(' ')} exited with code ${code}`)
        );
      }
    });
  });
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function detectBundler(pkgJson) {
  const scripts = pkgJson.scripts ?? {};
  const deps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  };
  const buildScript = scripts.build ?? '';

  if (deps?.vite || /vite/.test(buildScript)) {
    return 'vite';
  }
  if (deps?.['react-scripts'] || /react-scripts/.test(buildScript)) {
    return 'cra';
  }
  if (deps?.['@vue/cli-service'] || /vue-cli-service/.test(buildScript)) {
    return 'vue-cli';
  }
  if (deps?.['@angular/cli'] || /ng\s+build/.test(buildScript)) {
    return 'angular';
  }
  if (deps?.parcel || deps?.['parcel-bundler'] || /parcel/.test(buildScript)) {
    return 'parcel';
  }
  if (/next\s+build/.test(buildScript) || deps?.next) {
    return 'next';
  }
  return 'default';
}

function bundlerBuildConfig(bundler, demoName) {
  const basePath = `/docs/examples/${demoName}/`;
  switch (bundler) {
    case 'vite':
      return { extraArgs: ['--', '--base', './'] };
    case 'cra':
      return { env: { PUBLIC_URL: `/docs/examples/${demoName}` } };
    case 'vue-cli':
      return { extraArgs: ['--', '--publicPath', basePath] };
    case 'angular':
      return {
        extraArgs: ['--', '--base-href', basePath],
      };
    case 'parcel':
      return {
        extraArgs: ['--', '--public-url', basePath],
      };
    default:
      return {};
  }
}

async function findOutputDir(demoDir) {
  const candidates = ['dist', 'build', 'out'];
  for (const folder of candidates) {
    const candidatePath = path.join(demoDir, folder);
    if (!(await pathExists(candidatePath))) continue;

    const stats = await stat(candidatePath);
    if (!stats.isDirectory()) continue;

    // Angular often nests inside dist/<project>
    if (folder === 'dist') {
      const entries = await readdir(candidatePath, { withFileTypes: true });
      const subDirs = entries.filter((entry) => entry.isDirectory());
      if (subDirs.length === 1) {
        const nested = path.join(candidatePath, subDirs[0].name);
        if (await pathExists(path.join(nested, 'index.html'))) {
          return nested;
        }
      }
    }

    if (await pathExists(path.join(candidatePath, 'index.html'))) {
      return candidatePath;
    }
  }
  return null;
}

async function collectExamples() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => (filterRegex ? filterRegex.test(name) : true));
}

async function cleanupArtifacts(demoDir, bundler) {
  const candidates = new Set(BUILD_ARTIFACT_DIRS);
  if (bundler === 'angular') {
    candidates.add('dist');
  }

  for (const dirName of candidates) {
    const candidatePath = path.join(demoDir, dirName);
    if (await pathExists(candidatePath)) {
      await rm(candidatePath, { recursive: true, force: true });
    }
  }
}

async function cleanAllBuildArtifacts() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const demoDir = path.join(EXAMPLES_DIR, entry.name);

    // Clean build artifacts in each demo
    for (const dirName of BUILD_ARTIFACT_DIRS) {
      const artifactPath = path.join(demoDir, dirName);
      if (await pathExists(artifactPath)) {
        await rm(artifactPath, { recursive: true, force: true });
      }
    }

    // Also check for Angular nested dist
    const distPath = path.join(demoDir, 'dist');
    if (await pathExists(distPath)) {
      const distEntries = await readdir(distPath, { withFileTypes: true });
      const subDirs = distEntries.filter((e) => e.isDirectory());
      if (subDirs.length === 1) {
        // Angular nested structure, clean the nested dist too
        const nestedDist = path.join(distPath, subDirs[0].name);
        if (await pathExists(nestedDist)) {
          await rm(nestedDist, { recursive: true, force: true });
        }
      }
    }
  }
}

async function cleanAllNodeModules() {
  console.log('\n↳ cleaning node_modules in examples...');
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const demoDir = path.join(EXAMPLES_DIR, entry.name);
    const nodeModulesPath = path.join(demoDir, 'node_modules');
    if (await pathExists(nodeModulesPath)) {
      await rm(nodeModulesPath, { recursive: true, force: true });
    }
  }
  // Also clean root examples node_modules if it exists
  const rootNodeModules = path.join(EXAMPLES_DIR, 'node_modules');
  if (await pathExists(rootNodeModules)) {
    await rm(rootNodeModules, { recursive: true, force: true });
  }
  console.log('   ↳ node_modules cleanup completed');
}

async function installDependencies(demoDir, demoName) {
  if (workspaceMode) {
    return { skipped: true, reason: 'workspace-managed' };
  }
  const nodeModules = path.join(demoDir, 'node_modules');
  const hasNodeModules = await pathExists(nodeModules);
  if (skipInstall) {
    return { skipped: true };
  }
  if (hasNodeModules && !flags.has('--force-install')) {
    return { skipped: true };
  }

  const pm = pkgManager || {
    cmd: npmCmd,
    installArgs: ['install', '--no-audit', '--fund=false'],
  };
  console.log(`   ↳ installing dependencies...`);
  const start = Date.now();
  await runCommand(pm.cmd, pm.installArgs, {
    cwd: demoDir,
    env: process.env,
  });
  return { skipped: false, duration: prettyDuration(start) };
}

async function buildDemo(demoDir, demoName, bundler) {
  const pkgPath = path.join(demoDir, 'package.json');
  const pkgJson = JSON.parse(await readFile(pkgPath, 'utf8'));

  if (!pkgJson.scripts?.build) {
    console.warn(`   ⚠️  no build script; copying sources instead`);
    const targetDir = path.join(NEXT_PUBLIC_DIR, demoName);
    await rm(targetDir, { recursive: true, force: true });
    await mkdir(targetDir, { recursive: true });
    await cp(demoDir, targetDir, {
      recursive: true,
      filter: (src) => !src.includes('node_modules'),
    });
    return { copiedSources: true, targetDir };
  }

  if (bundler === 'next') {
    console.warn(
      `   ⚠️  skipping Next.js demo; build output is not static-ready`
    );
    return { skipped: true, reason: 'non-static framework' };
  }

  const { extraArgs = [], env = {} } = bundlerBuildConfig(bundler, demoName);
  const buildEnv = { ...process.env, ...env };

  const pm = pkgManager || { cmd: npmCmd };
  console.log(`   ↳ building (${bundler})...`);
  const start = Date.now();
  await runCommand(pm.cmd, ['run', 'build', ...extraArgs], {
    cwd: demoDir,
    env: buildEnv,
  });

  const outputDir = await findOutputDir(demoDir);
  if (!outputDir) {
    throw new Error('Build succeeded, but no output directory was found.');
  }

  const targetDir = path.join(NEXT_PUBLIC_DIR, demoName);
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(NEXT_PUBLIC_DIR, { recursive: true });
  await cp(outputDir, targetDir, { recursive: true });
  await cleanupArtifacts(demoDir, bundler);

  return {
    outputDir,
    targetDir,
    duration: prettyDuration(start),
    cleaned: true,
  };
}

async function main() {
  const startAll = Date.now();

  // Detect package manager first
  pkgManager = await detectPackageManager(EXAMPLES_DIR);
  console.log(`Using ${pkgManager.name} as package manager\n`);

  // Check for workspace in examples folder (not root)
  let examplesPkgJson = {};
  try {
    const pkgRaw = await readFile(
      path.join(EXAMPLES_DIR, 'package.json'),
      'utf8'
    );
    examplesPkgJson = JSON.parse(pkgRaw);
  } catch {
    examplesPkgJson = {};
  }
  workspaceMode =
    Array.isArray(examplesPkgJson.workspaces) &&
    examplesPkgJson.workspaces.length > 0;

  if (cleanOutput) {
    console.log('↳ cleaning build artifacts in examples folder...');
    await cleanAllBuildArtifacts();
    await rm(NEXT_PUBLIC_DIR, { recursive: true, force: true });
  }
  await mkdir(NEXT_PUBLIC_DIR, { recursive: true });

  if (workspaceMode && !skipInstall) {
    console.log(
      `↳ installing workspace dependencies in examples (using ${pkgManager.name})...`
    );
    const installStart = Date.now();
    try {
      await runCommand(pkgManager.cmd, pkgManager.workspaceInstallArgs, {
        cwd: EXAMPLES_DIR,
        env: process.env,
      });
      console.log(
        `   ↳ workspace install done in ${prettyDuration(installStart)}`
      );
    } catch (error) {
      console.error(`   ✗ workspace install failed: ${error.message || error}`);
      console.error(
        `   Tip: Run 'node scripts/find-problematic-demo.mjs' to identify problematic packages`
      );
      throw error;
    }
  }

  const demos = await collectExamples();
  if (demos.length === 0) {
    console.log('No demos matched the provided filters.');
    return;
  }

  console.log(
    `Building ${demos.length} demo${
      demos.length === 1 ? '' : 's'
    } into ${NEXT_PUBLIC_DIR} (concurrency: ${concurrency})`
  );

  const results = [];
  const limiter = new ConcurrencyLimiter(concurrency);

  // Process demos in parallel with concurrency limit
  const buildPromises = demos.map((demoName) =>
    limiter.run(async () => {
      const demoDir = path.join(EXAMPLES_DIR, demoName);
      const pkgPath = path.join(demoDir, 'package.json');

      // Initialize defaults
      let demoName_clean = demoName;
      let demoDescription = '';
      let bundler = 'unknown';

      if (!(await pathExists(pkgPath))) {
        console.log(`• ${demoName}: skipped (no package.json)`);
        return {
          path: demoName,
          name: demoName_clean,
          description: demoDescription,
          bundler,
          status: 'skipped',
          reason: 'no package.json',
        };
      }

      console.log(`• ${demoName} [started]`);
      const pkgJson = JSON.parse(await readFile(pkgPath, 'utf8'));
      bundler = detectBundler(pkgJson);

      // Skip unsupported bundlers (parcel, angular, vue-cli, next, etc.)
      if (bundler !== 'cra' && bundler !== 'vite') {
        console.log(`   ⚠️  ${demoName}: skipped (unsupported bundler: ${bundler})`);
        // Extract name and description for skipped demos too
        const rawName = pkgJson.name?.replace('@polotno-docs/', '') || demoName;
        demoName_clean = rawName
          .replace(/^polotno-/, '')
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        demoDescription = pkgJson.description || '';
        return {
          path: demoName,
          name: demoName_clean,
          description: demoDescription,
          bundler,
          status: 'skipped',
          reason: `unsupported bundler: ${bundler}`,
        };
      }

      // Extract name and description from package.json
      const rawName = pkgJson.name?.replace('@polotno-docs/', '') || demoName;
      // Format name: remove "polotno-" prefix, convert kebab-case to Title Case
      demoName_clean = rawName
        .replace(/^polotno-/, '')
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      demoDescription = pkgJson.description || '';

      try {
        const installInfo = await installDependencies(demoDir, demoName);
        if (!installInfo.skipped && installInfo.duration) {
          console.log(
            `   ↳ ${demoName}: install done in ${installInfo.duration}`
          );
        } else if (installInfo.reason === 'workspace-managed') {
          console.log(`   ↳ ${demoName}: using workspace dependencies`);
        }

        const buildInfo = await buildDemo(demoDir, demoName, bundler);
        if (buildInfo.skipped) {
          console.log(
            `   ⚠️  ${demoName}: skipped (${
              buildInfo.reason ?? 'unsupported output'
            })`
          );
          return {
            path: demoName,
            name: demoName_clean,
            description: demoDescription,
            bundler,
            status: 'skipped',
            reason: buildInfo.reason,
          };
        } else {
          if (buildInfo.duration) {
            console.log(
              `   ↳ ${demoName}: build done in ${buildInfo.duration}`
            );
          }
          console.log(
            `   ✔ ${demoName}: copied to ${path.relative(
              REPO_ROOT,
              buildInfo.targetDir ?? demoDir
            )}`
          );
          if (buildInfo.cleaned) {
            console.log(`   ↳ ${demoName}: removed local build artifacts`);
          }
          return {
            path: demoName,
            name: demoName_clean,
            description: demoDescription,
            bundler,
            status: 'success',
            ...buildInfo,
          };
        }
      } catch (error) {
        console.error(
          `   ✖ ${demoName}: failed - ${(error && error.message) || error}`
        );
        return {
          path: demoName,
          name: demoName_clean || demoName,
          description: demoDescription || '',
          bundler,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  const buildResults = await Promise.all(buildPromises);
  results.push(...buildResults);

  // Filter to only successful builds and format for display
  const successfulDemos = results
    .filter((result) => result.status === 'success')
    .map((result) => ({
      path: result.path,
      name: result.name,
      description: result.description,
    }));

  const manifest = {
    generatedAt: new Date().toISOString(),
    demos: successfulDemos,
  };
  await rm(path.join(NEXT_PUBLIC_DIR, 'manifest.json'), { force: true });
  await mkdir(NEXT_PUBLIC_DIR, { recursive: true });
  await writeJson(path.join(NEXT_PUBLIC_DIR, 'manifest.json'), manifest);

  const successes = results.filter((result) => result.status === 'success');
  const failures = results.filter((result) => result.status === 'failed');
  const skipped = results.filter((result) => result.status === 'skipped');

  // Clean up node_modules from all examples after building
  await cleanAllNodeModules();

  console.log('\nSummary:');
  console.log(`   Success: ${successes.length}`);
  console.log(`   Failed: ${failures.length}`);
  console.log(`   Skipped: ${skipped.length}`);
  if (failures.length > 0) {
    for (const failure of failures) {
      console.log(`     - ${failure.path}: ${failure.error}`);
    }
  }
  console.log(`\nCompleted in ${prettyDuration(startAll)}`);
}

async function writeJson(targetPath, data) {
  const json = JSON.stringify(data, null, 2);
  await rm(targetPath, { force: true });
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${json}\n`, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
