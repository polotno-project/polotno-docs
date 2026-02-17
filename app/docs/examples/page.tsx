import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
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
    <DocsPage full>
      <DocsTitle>Examples</DocsTitle>
      <DocsDescription>
        Interactive examples demonstrating Polotno features and integrations.
      </DocsDescription>
      <DocsBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {demos.map((demo) => (
            <Link
              key={demo.path}
              href={`/docs/examples/${demo.path}/index.html`}
              className="not-prose block p-4 sm:p-6 border border-fd-border rounded-lg hover:border-fd-primary hover:shadow-lg transition-all bg-fd-card"
            >
              <h3 className="text-lg font-semibold mb-2 sm:text-xl sm:mb-3">
                {demo.name}
              </h3>
              {demo.description && (
                <p className="text-sm text-fd-muted-foreground line-clamp-3">
                  {demo.description}
                </p>
              )}
            </Link>
          ))}
        </div>
        {demos.length === 0 && (
          <div className="text-center py-12 text-fd-muted-foreground">
            <p>
              No examples available. Run <code>npm run build:demos</code> to
              build examples.
            </p>
          </div>
        )}
      </DocsBody>
    </DocsPage>
  );
}
