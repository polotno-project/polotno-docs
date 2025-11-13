'use client';

import React from 'react';

type SandboxTheme = 'light' | 'dark';
type SandboxView = 'preview' | 'editor' | 'split';
type SandboxProvider = 'codesandbox' | 'stackblitz' | 'mixed';

export interface SandboxProps {
  /**
   * GitHub URL or path in the form
   * - https://github.com/<owner>/<repo>/tree/<branch>/<path>
   * - <owner>/<repo>/tree/<branch>/<path>
   */
  github: string;
  /** Height of the iframe container */
  height?: number | string;
  /** Theme for CodeSandbox embed */
  theme?: SandboxTheme;
  /** View mode for CodeSandbox */
  view?: SandboxView;
  /** Editor font size in CodeSandbox */
  fontSize?: number;
  /** Hide CodeSandbox navigation UI */
  hideNavigation?: boolean;
  /** Iframe title attribute */
  title?: string;
  /** Additional iframe allow attribute */
  allow?: string;
  /** Additional iframe sandbox attribute */
  sandbox?: string;
  /** Optional id for the iframe */
  id?: string;
  /** Additional styles for the wrapper */
  style?: React.CSSProperties;
  /** Provider for the playground embed */
  provider?: SandboxProvider;
}

function toEmbedPath(github: string): string {
  // Accept full GitHub URLs or already-trimmed paths
  try {
    const url = new URL(github);
    if (url.hostname.includes('github.com')) {
      // Remove leading slash
      return url.pathname.replace(/^\//, '');
    }
  } catch {
    // Not a full URL, assume user passed a path
  }
  return github.replace(/^\//, '');
}

function extractExampleName(github: string): string | null {
  const path = toEmbedPath(github);
  // Extract example name from path like: polotno-project/polotno-docs/tree/main/examples/polotno-demo
  const match = path.match(/examples\/([^\/]+)/);
  return match ? match[1] : null;
}

function buildDemoUrl(exampleName: string): string {
  return `/docs/examples/${exampleName}/index.html`;
}

export default function Sandbox({
  github,
  height = 600,
  theme = 'dark',
  view = 'preview',
  fontSize = 14,
  hideNavigation = true,
  title = 'Polotno demo',
  allow = 'geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb',
  sandbox = 'allow-modals allow-forms allow-popups allow-scripts allow-same-origin allow-downloads',
  id,
  style,
  provider = 'mixed',
}: SandboxProps) {
  const path = toEmbedPath(github);
  const exampleName = extractExampleName(github);
  const wrapperHeight = typeof height === 'number' ? `${height}px` : height;

  // Build sandbox URLs
  const buildCodeSandboxUrl = () => {
    const params = new URLSearchParams({
      fontsize: String(fontSize),
      hidenavigation: hideNavigation ? '1' : '0',
      theme,
      view,
    });
    return `https://codesandbox.io/embed/github/${path}?${params.toString()}`;
  };

  const buildStackBlitzUrl = () => {
    const params = new URLSearchParams({
      embed: '1',
      hideNavigation: hideNavigation ? '1' : '0',
      theme,
    });
    if (view) {
      params.set('view', view);
    }
    return `https://stackblitz.com/github/${path}?${params.toString()}`;
  };

  // If provider is codesandbox or stackblitz, show only the sandbox iframe
  if (provider === 'codesandbox' || provider === 'stackblitz') {
    const src =
      provider === 'stackblitz' ? buildStackBlitzUrl() : buildCodeSandboxUrl();
    return (
      <div
        style={{
          width: '100%',
          height: wrapperHeight,
          border: 0,
          overflow: 'hidden',
          borderRadius: 8,
          ...style,
        }}
      >
        <iframe
          id={id}
          src={src}
          title={title}
          allow={allow}
          sandbox={sandbox}
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            overflow: 'hidden',
          }}
        />
      </div>
    );
  }

  // For 'mixed' provider, show demo iframe with action buttons
  const demoUrl = exampleName ? buildDemoUrl(exampleName) : null;
  const codeSandboxUrl = buildCodeSandboxUrl();
  const stackBlitzUrl = buildStackBlitzUrl();
  const newPageUrl = demoUrl || codeSandboxUrl;

  return (
    <div
      style={{
        width: '100%',
        height: wrapperHeight,
        border: 0,
        overflow: 'hidden',
        borderRadius: 8,
        ...style,
      }}
    >
      {/* Action buttons */}
      <div className="flex gap-4 py-2">
        <button
          onClick={() => window.open(codeSandboxUrl, '_blank')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 hover:cursor-pointer"
        >
          Open in CodeSandbox
        </button>
        <button
          onClick={() => window.open(stackBlitzUrl, '_blank')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
        >
          Open in StackBlitz
        </button>
        {demoUrl && (
          <button
            onClick={() => window.open(newPageUrl, '_blank')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
          >
            Open in New Page
          </button>
        )}
      </div>
      {/* Demo iframe */}
      {demoUrl ? (
        <iframe
          id={id}
          src={demoUrl}
          title={title}
          allow={allow}
          sandbox={sandbox}
          className="border border-border rounded-lg"
          style={{
            width: '100%',
            height: `calc(100% - 28px)`, // Subtract button bar height
            overflow: 'hidden',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: `calc(100% - 28px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            color: '#666',
          }}
        >
          Could not extract example name from GitHub path
        </div>
      )}
    </div>
  );
}
