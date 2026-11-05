import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import 'polotno/ui.css';
import './theme.css';

import { DPI, PX, PAGE_MM, syncSettings, loadStarter } from './parts.js';
import { SECTIONS } from './panels.jsx';
import { TOOLBAR_COMPONENTS } from './toolbar.jsx';
import { FrameRulers } from './frame.jsx';
import { POLOTNO_KEY } from './render.js';
import { observer } from 'mobx-react-lite';
import { CANVAS, SURROUND, SELECTION, SELECTION_SOFT, HOVER, theme } from './theme.js';
import { ensureGrid } from './grid.js';

// this is a demo key just for that project
// (!) please don't use it in your projects
// to create your own API key please go here: https://polotno.com/login
const store = createStore({ key: POLOTNO_KEY, showCredit: true });
window.store = store;

// A black work area measured in millimetres, like a jeweler's CAD sheet. The
// workspace is the fixed frame, with mm rulers on its edges (frame.jsx); zoom
// and scroll only change what's inside it.
store.setUnit({ unit: 'mm', dpi: DPI });
store.setSize(PAGE_MM.width * PX, PAGE_MM.height * PX);
// Transparent on screen: the dot grid behind it shows through (frame.jsx).
store.addPage({ background: 'transparent' });

syncSettings(store);
ensureGrid(store, theme.name);
loadStarter(store, 'three-stone');
store.history.clear();

// One page, so no per-page add/duplicate buttons.
const NoPageControls = () => null;

const App = observer(() => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} sections={SECTIONS} defaultSection="metal" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} downloadButtonEnabled components={TOOLBAR_COMPONENTS} />
      <Workspace
        store={store}
        // Transparent, so the workspace's dot grid (frame.jsx) shows behind.
        backgroundColor="transparent"
        // No checkerboard on the transparent sheet: the grid shows instead.
        transparencyBackgroundColor="transparent"
        pageBorderColor="transparent"
        activePageBorderColor="transparent"
        transformerStyle={{
          borderStroke: SELECTION_SOFT[theme.name],
          borderStrokeWidth: 0.75,
          anchorStroke: SELECTION_SOFT[theme.name],
          anchorStrokeWidth: 0.75,
          anchorFill: CANVAS[theme.name],
          anchorSize: 7,
          anchorCornerRadius: 1,
        }}
        highlighterStyle={{ stroke: HOVER[theme.name], strokeWidth: 0.75 }}
        snapGuideStroke={SELECTION[theme.name]}
        selectionRectStroke={SELECTION[theme.name]}
        selectionRectFill="rgba(201,164,92,0.08)"
        paddingX={44}
        paddingY={44}
        components={{ PageControls: NoPageControls }}
      />
      <FrameRulers store={store} />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
  </PolotnoContainer>
));

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
