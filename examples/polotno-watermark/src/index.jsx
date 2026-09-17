import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';

import { WatermarkSection } from './WatermarkSection';
import { DEFAULT_CONFIG, WATERMARK, renderWatermark } from './watermark';

const store = createStore({
  key: 'HyhTCjrrUThWw9E7dO_y',
  showCredit: false,
});
store.setSize(1080, 1080);

// Handy when poking at the demo from the console, and how the docs examples
// are conventionally wired.
window.store = store;

const page = store.addPage();

// The artwork underneath, so the watermark has something to sit on top of.
page.addElement({
  type: 'image',
  name: 'artwork',
  x: 0,
  y: 0,
  width: store.width,
  height: store.height,
  src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  selectable: false,
});

/**
 * One element covering the page, holding a tiled watermark image that the
 * side panel redraws on every change. Three properties make it a watermark
 * rather than an ordinary element:
 *
 * - `selectable: false` keeps the person editing from grabbing or deleting it
 * - `alwaysOnTop: true` keeps it above anything they add later
 * - `showInExport` decides whether it lands in the downloaded file
 *
 * Nothing here is a watermarking service. It is the design schema.
 */
page.addElement({
  type: 'image',
  name: WATERMARK,
  x: 0,
  y: 0,
  width: store.width,
  height: store.height,
  src: '',
  opacity: DEFAULT_CONFIG.opacity,
  selectable: false,
  alwaysOnTop: true,
  showInExport: true,
  custom: { ...DEFAULT_CONFIG },
});

store.selectPage(page.id);
renderWatermark(store, DEFAULT_CONFIG);

// Lean on purpose: the watermark controls, plus enough to change the artwork.
const sections = [
  WatermarkSection,
  ...DEFAULT_SECTIONS.filter(
    (section) => section.name === 'photos' || section.name === 'upload'
  ),
];

export const App = () => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} sections={sections} defaultSection="watermark" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} downloadButtonEnabled />
      <Workspace store={store} />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
  </PolotnoContainer>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
