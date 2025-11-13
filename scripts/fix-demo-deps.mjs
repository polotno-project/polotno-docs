import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');

// Common dependencies that might be missing
const COMMON_DEPS = {
  'mobx-react-lite': ['observer', 'Observer', 'useObserver'],
  mobx: ['observable', 'computed', 'action', 'makeObservable', 'makeAutoObservable', 'reaction', 'autorun'],
  'mobx-react': ['observer', 'Observer', 'inject', 'Provider'],
  'react-dom': ['createRoot', 'render'],
  'react': ['React', 'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo'],
};

async function fixDemoDeps() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  const demos = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  let fixed = 0;
  let skipped = 0;

  for (const demoName of demos) {
    const demoDir = path.join(EXAMPLES_DIR, demoName);
    const pkgPath = path.join(demoDir, 'package.json');

    try {
      const pkgExists = await fileExists(pkgPath);
      if (!pkgExists) {
        skipped++;
        continue;
      }

      const pkgContent = await readFile(pkgPath, 'utf8');
      const pkgJson = JSON.parse(pkgContent);
      
      // Find all source files
      const srcFiles = await findSourceFiles(demoDir);
      const allImports = new Set();
      
      // Collect all imports from source files
      for (const filePath of srcFiles) {
        const content = await readFile(filePath, 'utf8');
        const imports = extractImports(content);
        imports.forEach(imp => allImports.add(imp));
      }

      // Check which dependencies are missing
      const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
      const missingDeps = new Map();

      // Check for mobx-react-lite (most common)
      if (allImports.has('observer') || allImports.has('Observer') || allImports.has('useObserver')) {
        if (!deps['mobx-react-lite'] && !deps['mobx-react']) {
          missingDeps.set('mobx-react-lite', '^4.0.0');
        }
      }

      // Check for mobx
      if (allImports.has('observable') || allImports.has('computed') || allImports.has('action') || 
          allImports.has('makeObservable') || allImports.has('makeAutoObservable')) {
        if (!deps.mobx) {
          missingDeps.set('mobx', '^6.0.0');
        }
      }

      // Check for react-dom
      if (allImports.has('createRoot') || allImports.has('render')) {
        if (!deps['react-dom']) {
          missingDeps.set('react-dom', pkgJson.dependencies?.react || '^18.2.0');
        }
      }

      // Add missing dependencies
      if (missingDeps.size > 0) {
        if (!pkgJson.dependencies) {
          pkgJson.dependencies = {};
        }
        for (const [dep, version] of missingDeps) {
          pkgJson.dependencies[dep] = version;
        }
        
        // Sort dependencies
        pkgJson.dependencies = Object.fromEntries(
          Object.entries(pkgJson.dependencies).sort(([a], [b]) => a.localeCompare(b))
        );

        const updatedContent = JSON.stringify(pkgJson, null, 2) + '\n';
        await writeFile(pkgPath, updatedContent, 'utf8');
        console.log(`✓ ${demoName}: added ${Array.from(missingDeps.keys()).join(', ')}`);
        fixed++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`✗ ${demoName}: ${error.message}`);
    }
  }

  console.log(`\nFixed: ${fixed}, Skipped: ${skipped}`);
}

function extractImports(content) {
  const imports = new Set();
  
  // Match import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*)+\s+from\s+['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
  
  // Extract from named imports: import { observer, something } from 'mobx-react-lite'
  const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = namedImportRegex.exec(content)) !== null) {
    const module = match[2];
    const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
    names.forEach(name => {
      imports.add(name);
    });
  }
  
  // Extract default imports: import React from 'react'
  const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = defaultImportRegex.exec(content)) !== null) {
    const name = match[1];
    const module = match[2];
    if (module === 'react') {
      imports.add('React');
    }
  }
  
  return imports;
}

async function findSourceFiles(dir) {
  const files = [];
  const extensions = ['.js', '.jsx', '.ts', '.tsx'];
  
  async function walk(currentDir) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'build', 'out', '.next'].includes(entry.name)) {
            await walk(fullPath);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await walk(dir);
  return files;
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

fixDemoDeps().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

