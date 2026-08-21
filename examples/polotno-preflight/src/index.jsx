import React from 'react';
import ReactDOM from 'react-dom/client';
import { reaction } from 'mobx';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { setGoogleFonts } from 'polotno/utils/fonts';

import { PreflightPanel } from './preflight-panel.jsx';
import { ARTWORK, BRAND_FONTS } from './artwork.js';
import { PRODUCT, PAGE_WIDTH, PAGE_HEIGHT } from './spec.js';

const store = createStore({
  key: 'HyhTCjrrUThWw9E7dO_y', // you can create it here: https://polotno.com/cabinet/
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});

// The brand's typefaces. Out of the box `getFontsList()` returns five Google
// fonts, so an integration declares what it actually uses — which is also what
// gives the font check something true to check against.
setGoogleFonts(['Roboto', ...BRAND_FONTS]);

// Physical units, not screen units. Every threshold in the report — type size
// in points, bleed in millimetres, hairline width — is derived from this, so
// it has to be set before anything is measured.
store.setUnit({ unit: 'mm', dpi: PRODUCT.dpi });
store.setSize(PAGE_WIDTH, PAGE_HEIGHT);

const page = store.addPage({
  bleed: ARTWORK.bleed,
  background: ARTWORK.background,
});
ARTWORK.children.forEach((element) => page.addElement(element));
store.selectElements([]);

// Bleed guides follow the design: drawn whenever the page has bleed, gone when
// it does not. Nothing to toggle — there is only one correct answer.
reaction(
  () => (store.activePage?.bleed || 0) > 0,
  (hasBleed) => store.toggleBleed(hasBleed),
  { fireImmediately: true }
);

// Handy for poking at the design from the browser console.
window.store = store;

export const App = ({ store }) => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} defaultSection="" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} />
      <Workspace store={store} />
      <ZoomButtons store={store} />
      <PagesTimeline store={store} />
    </WorkspaceWrap>
    {/* PolotnoContainer is a flex row — this lands on the right. */}
    <PreflightPanel store={store} />
  </PolotnoContainer>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
