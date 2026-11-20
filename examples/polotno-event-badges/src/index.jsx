import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS, VariablesSection } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import 'polotno/ui.css';

import { GuestPanel } from './guest-panel.jsx';
import { KEY, template } from './template.js';

// The Variables section is opt-in: it comes first here, for the template
// author, next to a few default panels.
const SECTIONS = [
  VariablesSection,
  ...DEFAULT_SECTIONS.filter((s) => ['text', 'elements', 'upload', 'layers'].includes(s.name)),
];

// In a narrow window, such as the embed on polotno.com/demo, the side panel
// starts closed so the canvas keeps room beside the guest list.
const DEFAULT_SECTION = window.innerWidth >= 1040 ? 'variables' : '';

const store = createStore({
  key: KEY,
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});
store.loadJSON(template);

export const App = ({ store }) => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} sections={SECTIONS} defaultSection={DEFAULT_SECTION} />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} />
      <Workspace store={store} />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
    <GuestPanel store={store} />
  </PolotnoContainer>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
