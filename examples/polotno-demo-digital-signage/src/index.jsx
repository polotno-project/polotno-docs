import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { PagesTimeline } from 'polotno/pages-timeline';
import { createStore } from 'polotno/model/store';
import heroJson from './hero.json';

const store = createStore({ key: 'nFA5H9elEytDyPyvKL7T', showCredit: true });

// Open on a real, professional template so the editor looks designed on load.
try {
  store.loadJSON(heroJson);
} catch (e) {
  console.error('failed to load starting design', e);
}
if (!store.pages.length) store.addPage();

export const App = () => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} sections={DEFAULT_SECTIONS} defaultSection="templates" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} downloadButtonEnabled />
      <Workspace store={store} />
      <ZoomButtons store={store} />
      <PagesTimeline store={store} />
    </WorkspaceWrap>
  </PolotnoContainer>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
