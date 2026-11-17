import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Button } from 'polotno/primitives';

import { createStore } from 'polotno/model/store';
import { rotatePages } from './rotate-pages';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T', // you can create it here: https://polotno.com/login
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});
const page = store.addPage();

// load template
fetch(
  'https://api.polotno.com/templates/2021-10-25-youtube-thumbnail-gradient-gaming.json'
)
  .then((res) => res.json())
  .then((data) => {
    store.loadJSON(data);
  });

const PageRotate = ({ store }) => {
  return (
    <Button
      variant="ghost"
      onClick={() => rotatePages(store)}
    >
      Rotate 90°
    </Button>
  );
};

export const App = ({ store }) => {
  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} components={{ ActionControls: PageRotate }} />
        <Workspace store={store} />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
