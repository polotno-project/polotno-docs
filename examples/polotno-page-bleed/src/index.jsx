import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Button,
  FieldRow,
  Navbar,
  NumericInput,
  Switch,
} from 'polotno/primitives';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';
import { observer } from 'mobx-react-lite';

// create store
const store = createStore({
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.com/cabinet
  key: 'nFA5H9elEytDyPyvKL7T',
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});

// add page and element instantly
store.addPage({ bleed: 20 });
// show bleed
store.toggleBleed();

const Topbar = observer(({ store }) => {
  return (
    <Navbar>
      <Navbar.Group align="left" style={{ gap: 16 }}>
        <FieldRow label="Bleed size (px)" style={{ gap: 8 }}>
          <NumericInput
            value={store.activePage.bleed}
            min={0}
            onValueChange={(bleed) => {
              store.activePage.set({ bleed });
            }}
            style={{ width: 80 }}
          />
        </FieldRow>
        <Navbar.Divider />
        <FieldRow label="Show bleed" style={{ gap: 8 }}>
          <Switch
            checked={store.bleedVisible}
            onCheckedChange={(visible) => {
              store.toggleBleed(visible);
            }}
          />
        </FieldRow>
      </Navbar.Group>
      <Navbar.Group align="right">
        <Button
          onClick={() => {
            store.saveAsImage({ includeBleed: true });
          }}
        >
          Export
        </Button>
      </Navbar.Group>
    </Navbar>
  );
});

export const App = () => {
  return (
    // `polotno-ui` puts the top bar inside Polotno's CSS context,
    // so it picks up the editor's font and theme tokens
    <div
      className="polotno-ui"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Topbar store={store} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <PolotnoContainer className="polotno-app-container">
          <SidePanelWrap>
            <SidePanel store={store} />
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar store={store} />
            <Workspace store={store} />
            <ZoomButtons store={store} />
            <PagesTimeline store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
