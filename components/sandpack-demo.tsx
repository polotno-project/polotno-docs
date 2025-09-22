'use client';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import React from 'react';

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
}

export function SandpackDemo({
  dependencies = {},
  files = {},
  options = {},
  height = 600,
  theme = 'light',
}: SandpackDemoProps) {
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

  return (
    <div style={{ margin: '20px 0' }}>
      <SandpackProvider
        template="react"
        files={defaultFiles}
        customSetup={{
          dependencies: defaultDependencies,
        }}
        options={sandpackOptions}
        theme={theme}
      >
        <SandpackPreview
          style={{
            height: typeof height === 'number' ? `${height}px` : height,
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
        />
      </SandpackProvider>
    </div>
  );
}

// Export for MDX usage
export default SandpackDemo;
