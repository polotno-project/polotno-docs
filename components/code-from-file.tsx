import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

interface CodeFromFileProps {
  /** Absolute or project-relative path to the file to display */
  src: string;
  /** Optional title shown in the code block header */
  title?: string;
  /** Language for syntax highlighting. Defaults to extension */
  language?: string;
  /** Allow copy button */
  allowCopy?: boolean;
  /** Extra class name for the code block */
  className?: string;
}

export default async function CodeFromFile({
  src,
  title,
  language,
  allowCopy = true,
  className,
}: CodeFromFileProps) {
  const absolutePath = path.isAbsolute(src)
    ? src
    : path.join(process.cwd(), src);
  const code = await fs.readFile(absolutePath, 'utf-8');

  const inferredFromTitle = title?.split('.').pop();
  const inferredFromPath = path.extname(absolutePath).slice(1);
  const lang = language ?? inferredFromTitle ?? (inferredFromPath || 'tsx');

  return (
    <DynamicCodeBlock
      lang={lang}
      code={code}
      codeblock={{ title, allowCopy, className }}
    />
  );
}
