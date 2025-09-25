import React from 'react';

type SandboxTheme = 'light' | 'dark';
type SandboxView = 'preview' | 'editor' | 'split';

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
}: SandboxProps) {
  const path = toEmbedPath(github);
  const params = new URLSearchParams({
    fontsize: String(fontSize),
    hidenavigation: hideNavigation ? '1' : '0',
    theme,
    view,
  });
  const src = `https://codesandbox.io/embed/github/${path}?${params.toString()}`;

  const wrapperHeight = typeof height === 'number' ? `${height}px` : height;

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
        style={{ width: '100%', height: '100%', border: 0, overflow: 'hidden' }}
      />
    </div>
  );
}
