import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';

import { template } from './template';
import { SizingControls } from './controls';

const store = createStore({
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.com/cabinet
  key: 'nFA5H9elEytDyPyvKL7T',
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});
store.loadJSON(template);
store.selectElements([]);

const App = ({ store }) => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SizingControls store={store} />
    <WorkspaceWrap>
      <Toolbar store={store} />
      <Workspace store={store} />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
  </PolotnoContainer>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
