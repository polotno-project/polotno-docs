import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');

async function fixDemoStyles() {
  const entries = await readdir(EXAMPLES_DIR, { withFileTypes: true });
  const demos = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  let fixed = 0;
  let skipped = 0;

  for (const demoName of demos) {
    const demoDir = path.join(EXAMPLES_DIR, demoName);
    
    try {
      // Fix JS/JSX/TS/TSX files
      const srcFiles = await findSourceFiles(demoDir);
      let demoFixed = false;

      for (const filePath of srcFiles) {
        const content = await readFile(filePath, 'utf8');
        let newContent = content;
        let fileChanged = false;

        // Replace blueprint.css import with scoped CSS link (remove import, will add to HTML)
        if (content.includes("@blueprintjs/core/lib/css/blueprint.css")) {
          // Match import statement on its own line or with other imports
          newContent = newContent.replace(
            /import\s+['"]@blueprintjs\/core\/lib\/css\/blueprint\.css['"];?\s*\n?/g,
            ''
          );
          // Also match if it's part of a multi-line import
          newContent = newContent.replace(
            /import\s+['"]@blueprintjs\/core\/lib\/css\/blueprint\.css['"];?\s*/g,
            ''
          );
          fileChanged = true;
        }

        // Add bp5-scope class to PolotnoContainer
        if (content.includes('<PolotnoContainer') && !content.includes('bp5-scope')) {
          // Handle JSX with style={{...}} or other attributes
          newContent = newContent.replace(
            /<PolotnoContainer(\s+[^>]*)?>/g,
            (match, attrs = '') => {
              // Check if className already exists
              const classNameMatch = attrs.match(/className=["']([^"']*)["']/);
              if (classNameMatch) {
                const classes = classNameMatch[1];
                if (!classes.includes('bp5-scope')) {
                  return match.replace(
                    /className=["']([^"']*)["']/,
                    `className="${classes} bp5-scope"`
                  );
                }
                return match;
              }
              // Add className as first attribute
              return `<PolotnoContainer className="bp5-scope"${attrs}>`;
            }
          );
          fileChanged = true;
        }

        if (fileChanged) {
          await writeFile(filePath, newContent, 'utf8');
          demoFixed = true;
        }
      }

      // Fix HTML files - add scoped CSS link
      const htmlFiles = await findHtmlFiles(demoDir);
      for (const filePath of htmlFiles) {
        const content = await readFile(filePath, 'utf8');
        let newContent = content;
        let fileChanged = false;

        // Remove old blueprint.css link if exists
        if (content.includes('@blueprintjs/core@5/lib/css/blueprint.css')) {
          newContent = newContent.replace(
            /<link[^>]*href=["']https:\/\/unpkg\.com\/@blueprintjs\/core@5\/lib\/css\/blueprint\.css["'][^>]*>\s*\n?/gi,
            ''
          );
          fileChanged = true;
        }

        // Add scoped CSS link if not present
        if (!content.includes('blueprint.polotno.css')) {
          // Find head tag and add before closing head
          if (content.includes('</head>')) {
            newContent = newContent.replace(
              '</head>',
              '  <link\n    href="https://unpkg.com/polotno@^2/blueprint.polotno.css"\n    rel="stylesheet"\n  />\n</head>'
            );
            fileChanged = true;
          } else if (content.includes('<head>')) {
            // Add after opening head
            newContent = newContent.replace(
              '<head>',
              '<head>\n  <link\n    href="https://unpkg.com/polotno@^2/blueprint.polotno.css"\n    rel="stylesheet"\n  />'
            );
            fileChanged = true;
          }
        }

        if (fileChanged) {
          await writeFile(filePath, newContent, 'utf8');
          demoFixed = true;
        }
      }

      if (demoFixed) {
        console.log(`✓ ${demoName}`);
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

async function findSourceFiles(dir) {
  const files = [];
  const extensions = ['.js', '.jsx', '.ts', '.tsx'];
  
  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and build directories
        if (!['node_modules', 'dist', 'build', 'out', '.next'].includes(entry.name)) {
          await walk(fullPath);
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

async function findHtmlFiles(dir) {
  const files = [];
  
  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', 'build', 'out', '.next'].includes(entry.name)) {
          await walk(fullPath);
        }
      } else if (entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

fixDemoStyles().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

