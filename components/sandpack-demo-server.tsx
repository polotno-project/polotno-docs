import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';

import SandpackDemoClient from './sandpack-demo';

type FileSpec = string | { path: string; as?: string };

interface SandpackDemoServerProps {
  /** Dependencies passed to the client Sandpack */
  dependencies?: Record<string, string>;
  /** Inline files passed through directly */
  files?: Record<string, string>;
  /** Absolute or project-relative file paths to load from disk */
  fileSrc?: FileSpec | FileSpec[];
  /** Options forwarded to Sandpack */
  options?: Record<string, any>;
  /** Height forwarded to Sandpack */
  height?: number | string;
  /** Theme forwarded to Sandpack */
  theme?: 'light' | 'dark' | 'auto';
}

async function readOneFile(spec: FileSpec): Promise<[string, string]> {
  if (typeof spec === 'string') {
    const absPath = path.isAbsolute(spec)
      ? spec
      : path.join(process.cwd(), spec);
    const content = await fs.readFile(absPath, 'utf-8');
    const virtualPath = '/' + path.basename(absPath);
    return [virtualPath, content];
  }
  const absPath = path.isAbsolute(spec.path)
    ? spec.path
    : path.join(process.cwd(), spec.path);
  const content = await fs.readFile(absPath, 'utf-8');
  const virtualPath = spec.as ?? '/' + path.basename(absPath);
  return [virtualPath, content];
}

export default async function SandpackDemoServer(
  props: SandpackDemoServerProps
) {
  const { dependencies, files, fileSrc, options, height, theme } = props;

  let loadedFiles: Record<string, string> = {};
  if (fileSrc) {
    const list = Array.isArray(fileSrc) ? fileSrc : [fileSrc];
    const entries = await Promise.all(list.map(readOneFile));
    for (const [virtualPath, content] of entries) {
      loadedFiles[virtualPath] = content;
    }
  }

  const mergedFiles = { ...loadedFiles, ...(files ?? {}) };

  return (
    <SandpackDemoClient
      dependencies={dependencies}
      files={mergedFiles}
      options={options}
      height={height}
      theme={theme}
    />
  );
}
