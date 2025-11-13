import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';
import Link from 'next/link';
import type { Metadata } from 'next';

interface Demo {
  path: string;
  name: string;
  description: string;
}

export const metadata: Metadata = {
  title: 'Examples',
  description:
    'Interactive examples demonstrating Polotno features and integrations',
};

async function getDemos(): Promise<Demo[]> {
  try {
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const manifestPath = join(
      process.cwd(),
      'public',
      'docs',
      'examples',
      'manifest.json'
    );
    const manifestContent = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    return manifest.demos || [];
  } catch {
    return [];
  }
}

export default async function ExamplesPage() {
  const demos = await getDemos();

  return (
    <div className="fumadocs-page p-4">
      <h1 className="text-4xl font-bold mb-4">Examples</h1>
      <p className="text-muted-foreground mb-8 text-lg">
        Explore interactive examples demonstrating Polotno features and
        integrations.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demos.map((demo) => (
          <Link
            key={demo.path}
            href={`/docs/examples/${demo.path}/index.html`}
            className="block p-6 border border-border rounded-lg hover:border-primary hover:shadow-lg transition-all bg-card"
          >
            <h3 className="text-xl font-semibold mb-3">{demo.name}</h3>
            {demo.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {demo.description}
              </p>
            )}
          </Link>
        ))}
      </div>
      {demos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            No examples available. Run `npm run build:demos` to build examples.
          </p>
        </div>
      )}
    </div>
  );
}
