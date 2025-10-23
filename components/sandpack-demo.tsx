'use client';
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackLayout,
} from '@codesandbox/sandpack-react';
import React, { useState } from 'react';

interface SandpackDemoProps {
  /** Custom dependencies to include alongside polotno */
  dependencies?: Record<string, string>;
  /** Files to include in the sandbox */
  files?: Record<string, string>;
  /** Custom options for the sandpack instance */
  options?: {
    externalResources?: string[];
    bundlerURL?: string;
    [key: string]: any;
  };
  /** Height of the sandbox */
  height?: number | string;
  /** Theme for the sandbox */
  theme?: 'light' | 'dark' | 'auto';
  /** Whether to enable code viewing. If true, shows a toggle button to show/hide code. Can be 'always' to always show code, or 'editor-only' to only show editor without preview */
  showCode?: boolean | 'always' | 'editor-only';
  /** Which file to show in the editor by default */
  activeFile?: string;
  /** Whether code should be visible by default when showCode is true */
  defaultCodeOpen?: boolean;
}

export function SandpackDemo({
  dependencies = {},
  files = {},
  options = {},
  height = 600,
  theme = 'light',
  showCode = true,
  activeFile = '/App.js',
  defaultCodeOpen = false,
}: SandpackDemoProps) {
  const [isCodeVisible, setIsCodeVisible] = useState(defaultCodeOpen);
  // Default dependencies - always include polotno and common React dependencies
  const defaultDependencies = {
    polotno: 'latest',
    react: '^18.0.0',
    'react-dom': '^18.0.0',
    'react-scripts': '^5.0.0',
    ...dependencies,
  };

  // Default App.js file if none provided
  const defaultFiles = {
    '/App.js': `import React from 'react';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T', // you can create it here: https://polotno.com/cabinet/
  // you can hide this key from other users by setting up your own proxy server
  // see: https://polotno.com/docs/polotno-for-developers/
});

export default function App() {
  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} downloadButtonEnabled />
        <Workspace store={store} />
        <ZoomButtons store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
}`,
    'index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './base.css';
import App from '../App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    '/base.css': {
      code: `body {
  margin: 0;
  padding: 0;
}`,
      hidden: true,
      readOnly: true,
    },
    ...files,
  };

  const sandpackOptions = {
    ...options,
  };

  // Determine what to render based on showCode mode and visibility state
  const shouldShowEditor =
    showCode === 'editor-only' ||
    showCode === 'always' ||
    (showCode && isCodeVisible);
  const shouldShowPreview = showCode !== 'editor-only';
  const showToggleButton = showCode === true;

  return (
    <div className="my-6">
      <SandpackProvider
        template="react"
        files={defaultFiles}
        customSetup={{
          dependencies: defaultDependencies,
        }}
        options={{
          ...sandpackOptions,
          activeFile: activeFile,
        }}
        theme={theme}
      >
        <div className="relative">
          {showToggleButton && (
            <button
              onClick={() => setIsCodeVisible(!isCodeVisible)}
              className="mb-3 inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-secondary px-3 py-1.5 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              {isCodeVisible ? 'Hide Code' : 'Show Code'}
            </button>
          )}
          {shouldShowEditor && shouldShowPreview ? (
            <SandpackLayout
              style={{
                border: '1px solid var(--fd-border)',
                borderRadius: '8px',
              }}
            >
              <SandpackCodeEditor
                style={{
                  height: typeof height === 'number' ? `${height}px` : height,
                }}
                showTabs
                showLineNumbers
                showInlineErrors
              />
              <SandpackPreview
                style={{
                  height: typeof height === 'number' ? `${height}px` : height,
                }}
                showOpenInCodeSandbox={false}
                showRefreshButton={true}
              />
            </SandpackLayout>
          ) : shouldShowEditor ? (
            <SandpackCodeEditor
              style={{
                height: typeof height === 'number' ? `${height}px` : height,
                border: '1px solid var(--fd-border)',
                borderRadius: '8px',
              }}
              showTabs
              showLineNumbers
              showInlineErrors
            />
          ) : (
            <SandpackPreview
              style={{
                height: typeof height === 'number' ? `${height}px` : height,
                border: '1px solid var(--fd-border)',
                borderRadius: '8px',
              }}
              showOpenInCodeSandbox={false}
              showRefreshButton={true}
            />
          )}
        </div>
      </SandpackProvider>
    </div>
  );
}

// Export for MDX usage
export default SandpackDemo;
