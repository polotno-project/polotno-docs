import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { setGoogleFonts } from 'polotno/utils/fonts';
import 'polotno/ui.css';
import '../../shared/studio-theme.css';

import { sampleArtwork } from './artwork.js';
import { CutPanel, startCutLine } from './cut-panel.jsx';

// Upload a transparent PNG, add text or elements: the cut line follows.
const SECTIONS = DEFAULT_SECTIONS.filter((s) => ['upload', 'text', 'photos', 'elements', 'layers'].includes(s.name));

const store = createStore({
  key: 'HyhTCjrrUThWw9E7dO_y', // you can create it here: https://polotno.com/login
  showCredit: true,
});
setGoogleFonts(['Roboto', 'Rubik Mono One']);

// A 90 × 90 mm sticker at print resolution. The page itself is transparent:
// the sticker is the artwork plus the margin around it, not a square.
const DPI = 300;
const mm = (v) => (v / 25.4) * DPI;
store.setUnit({ unit: 'mm', dpi: DPI });
store.setSize(mm(90), mm(90));
const page = store.addPage({ background: 'transparent' });
sampleArtwork(mm).forEach((el) => page.addElement(el));
store.selectElements([]);

startCutLine(store);
window.store = store;

const App = () => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} sections={SECTIONS} defaultSection="upload" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} downloadButtonEnabled={false} />
      <Workspace store={store} backgroundColor="#f4f4f4" />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
    {/* PolotnoContainer is a flex row, so this lands on the right. */}
    <CutPanel store={store} />
  </PolotnoContainer>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
