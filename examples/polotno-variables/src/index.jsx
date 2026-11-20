import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS, VariablesSection } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { PreviewButton } from './preview-button';
import { json } from './sample';

// The Variables section is opt-in: add it to the sections your template
// authors see. Here it comes first, next to a few default panels.
const SECTIONS = [
  VariablesSection,
  ...DEFAULT_SECTIONS.filter((s) =>
    ['text', 'photos', 'elements', 'upload', 'background', 'layers'].includes(s.name)
  ),
];

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T', // you can create it here: https://polotno.com/login
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});
store.loadJSON(json);

export const App = ({ store }) => {
  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} sections={SECTIONS} defaultSection="variables" />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} components={{ ActionControls: PreviewButton }} />
        <Workspace store={store} />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
