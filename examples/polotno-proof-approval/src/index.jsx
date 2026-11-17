import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { handleHotkey, handlePasteEvent } from 'polotno/canvas/hotkeys';
import { createStore } from 'polotno/model/store';
import { setGoogleFonts } from 'polotno/utils/fonts';
import { observer } from 'mobx-react-lite';
import 'polotno/ui.css';
import '../../shared/studio-theme.css';

import { sampleDesign } from './design.js';
import { app } from './proof.js';
import { ProofPanel } from './proof-panel.jsx';

const SECTIONS = DEFAULT_SECTIONS.filter((s) => ['text', 'photos', 'elements', 'upload', 'background', 'layers'].includes(s.name));

const store = createStore({
  key: 'HyhTCjrrUThWw9E7dO_y', // you can create it here: https://polotno.com/login
  showCredit: true,
});
setGoogleFonts(['Roboto', 'Playfair Display']);

// An A6 postcard at print resolution.
const DPI = 300;
const mm = (v) => (v / 25.4) * DPI;
store.setUnit({ unit: 'mm', dpi: DPI });
store.setSize(mm(148), mm(105));
const page = store.addPage({ background: '#f7f3ec' });
sampleDesign(mm).forEach((el) => page.addElement(el));
store.selectElements([]);
window.store = store;

// The designer edits with the full editor. The customer only reviews: no side
// panel, no toolbar (it holds unlock and delete), no page controls or hotkeys,
// and every element is locked (see proof.js).
const App = observer(() => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    {app.view === 'designer' && (
      <SidePanelWrap>
        <SidePanel store={store} sections={SECTIONS} defaultSection="" />
      </SidePanelWrap>
    )}
    <WorkspaceWrap>
      {app.view === 'designer' && <Toolbar store={store} downloadButtonEnabled={false} />}
      <Workspace
        store={store}
        backgroundColor="#f4f4f4"
        pageControlsEnabled={app.view === 'designer'}
        // Hotkeys and paste would still add elements, so the customer gets neither.
        onKeyDown={(e, s) => app.view === 'designer' && handleHotkey(e, s)}
        onPaste={(e, s) => app.view === 'designer' && handlePasteEvent(e, s)}
      />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
    {/* PolotnoContainer is a flex row, so this lands on the right. */}
    <ProofPanel store={store} />
  </PolotnoContainer>
));

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
