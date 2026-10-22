import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';

import { peechoSection } from './peecho-section';

// An A3 art print editor with a Peecho tab. Peecho's Fine Art Print A3 is
// 297 × 420 mm and takes a one-page PDF at that size; the editor works in
// millimetres at 300 DPI so the export matches it exactly.

const DPI = 300;
const WIDTH_MM = 297;
const HEIGHT_MM = 420;
const px = (mm) => (mm / 25.4) * DPI;

const store = createStore({ key: 'nFA5H9elEytDyPyvKL7T', showCredit: false });
window.store = store;

store.setUnit({ unit: 'mm', dpi: DPI });
store.setSize(px(WIDTH_MM), px(HEIGHT_MM));
const page = store.addPage();

// A starter poster.
const W = store.width;
const H = store.height;
page.set({ background: '#f3ede4' });
page.addElement({
  type: 'figure',
  subType: 'circle',
  x: W * 0.15,
  y: H * 0.14,
  width: W * 0.7,
  height: W * 0.7,
  fill: '#e4572e',
});
page.addElement({
  type: 'text',
  text: 'SUMMER\nIN THE CITY',
  x: W * 0.08,
  y: H * 0.68,
  width: W * 0.84,
  fontSize: W * 0.11,
  lineHeight: 1,
  fontFamily: 'Oswald',
  fill: '#1f2a44',
  align: 'center',
});
page.addElement({
  type: 'text',
  text: 'Fine art print · A3',
  x: W * 0.2,
  y: H * 0.9,
  width: W * 0.6,
  fontSize: W * 0.03,
  fontFamily: 'Roboto',
  fill: '#1f2a44',
  align: 'center',
});
store.selectElements([]);

// Only what a poster needs: no generic templates, no resize (the print size
// is fixed by the product), no drawing.
const sections = [
  peechoSection({ widthMm: WIDTH_MM, heightMm: HEIGHT_MM }),
  ...DEFAULT_SECTIONS.filter((s) =>
    ['text', 'photos', 'elements', 'upload', 'background', 'layers'].includes(s.name)
  ),
];

const App = () => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} sections={sections} defaultSection="peecho" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} downloadButtonEnabled />
      <Workspace store={store} />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
  </PolotnoContainer>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
