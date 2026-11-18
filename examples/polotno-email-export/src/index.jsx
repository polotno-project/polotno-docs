import React from 'react';
import ReactDOM from 'react-dom/client';
import { observer } from 'mobx-react-lite';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { ColorPicker } from 'polotno/toolbar/color-picker';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { setGoogleFonts } from 'polotno/utils/fonts';
import { Button, ToggleGroup, ToggleGroupItem } from 'polotno/primitives';
import 'polotno/ui.css';

import { SECTIONS } from './sections.jsx';
import { Preview } from './preview.jsx';
import { Icons } from './icons.jsx';
import { EmailOverlay } from './overlay.jsx';
import { BLOCKS, STARTER, COLORS } from './blocks.js';
import { DESKTOP_WIDTH, MOBILE_WIDTH } from './layout.js';
import { KEY, DESKTOP, MOBILE, email, watchStore, openPreview } from './email.js';

const store = createStore({ key: KEY, showCredit: true });
setGoogleFonts(['Roboto', 'Inter', 'Playfair Display']);
window.store = store;
window.email = email;

// Two pages with fixed ids: the email (600 px) and its phone layout (350 px).
// Both start from the same blocks, built for their width.
function addEmailPage(pageId, width) {
  const page = store.addPage({ id: pageId, width, height: 100, background: COLORS.page });
  let y = 0;
  STARTER.forEach((name) => {
    const block = BLOCKS.find((b) => b.name === name).build(width, email.theme);
    block.elements.forEach((el) => page.addElement({ ...el, y: el.y + y }, { skipSelect: true }));
    (block.groups || []).forEach((ids) => store.groupElements(ids));
    y += block.height;
  });
  page.set({ height: y });
  return page;
}
store.setSize(DESKTOP_WIDTH, 1000);
addEmailPage(DESKTOP, DESKTOP_WIDTH);
addEmailPage(MOBILE, MOBILE_WIDTH);
store.selectPage(DESKTOP);
store.selectElements([]);
store.history.clear();
watchStore(store);

// ---------- toolbar ----------

const DeviceToggle = observer(({ store }) => (
  <ToggleGroup variant="outline" value={[store.activePage?.id]} onValueChange={(v) => v[0] && (store.selectElements([]), store.selectPage(v[0]))}>
    <ToggleGroupItem value={DESKTOP} aria-label="Desktop layout" title="Desktop: 600 px">
      {Icons.desktop({ size: 16 })}
    </ToggleGroupItem>
    <ToggleGroupItem value={MOBILE} aria-label="Mobile layout" title="Mobile: 350 px">
      {Icons.mobile({ size: 16 })}
    </ToggleGroupItem>
  </ToggleGroup>
));

const ActionControls = () => (
  <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
    <Button variant="outline" onClick={openPreview}>
      {Icons.eye({ size: 16 })}
      Preview
    </Button>
  </div>
);

// Email text has no gradients, effects or animation: a solid colour picker
// replaces the fill picker, and the effects and animation controls are gone.
const TextFill = observer(({ elements, store }) => (
  <ColorPicker
    value={elements[0].fill}
    gradientEnabled={false}
    store={store}
    onChange={(fill) => store.history.transaction(() => elements.forEach((el) => el.set({ fill })))}
  />
));
const TOOLBAR = {
  ActionControls,
  TextFill,
  TextFilters: () => null,
  TextAnimations: () => null,
};

// ---------- app ----------

const App = observer(() => {
  // Rotated text is sent as an image, so text cannot be rotated.
  const hasText = store.selectedElements.some((el) => el.type === 'text' || el.type === 'group');
  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} sections={SECTIONS} defaultSection="content" />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} components={TOOLBAR} />
        <Workspace
          store={store}
          renderOnlyActivePage
          // The page-controls slot carries the email overlay instead of page buttons.
          components={{ PageControls: EmailOverlay }}
          backgroundColor="#f5f5f5"
          transformerStyle={{ rotateEnabled: !hasText }}
        />
        <ZoomButtons store={store} />
        {/* Desktop / mobile sits on the canvas, so the toolbar keeps room for every element's controls. */}
        <div style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 10 }}>
          <DeviceToggle store={store} />
        </div>
      </WorkspaceWrap>
      <Preview />
    </PolotnoContainer>
  );
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
