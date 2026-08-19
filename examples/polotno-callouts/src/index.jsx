import React from 'react';
import { createRoot } from 'react-dom/client';
import { observer } from 'mobx-react-lite';

import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import 'polotno/ui.css';

// way 2 registers a new element type, so this import must run before a design
// with a `callout` element is loaded
import './custom-element/callout-element';
import {
  addCustomCallout,
  installCustomSync,
} from './custom-element/add-callout';
import { addBuiltinCallout, installBuiltinSync } from './builtin/callout';
import { CALLOUT_TOOLBAR } from './callout-toolbar';
import { CalloutsSection } from './callouts-panel';
import { PRESETS } from './shared/presets';

const store = createStore({
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.com/cabinet
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});
store.addPage();

// useful in the console of the browser: store.toJSON(), store.selectedElements
window.store = store;

installBuiltinSync(store);
installCustomSync(store);

// one callout of each way, to compare them
addBuiltinCallout(store, PRESETS[0], { x: 60, y: 120 });
addCustomCallout(store, PRESETS[0], { x: 480, y: 120 });
store.selectElements([]);

const sections = [CalloutsSection, ...DEFAULT_SECTIONS];

const App = observer(() => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} sections={sections} defaultSection="callouts" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar
        store={store}
        components={CALLOUT_TOOLBAR}
        downloadButtonEnabled
      />
      <Workspace store={store} />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
  </PolotnoContainer>
));

createRoot(document.getElementById('root')).render(<App />);
