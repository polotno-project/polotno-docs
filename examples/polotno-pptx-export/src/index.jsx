import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { jsonToPPTX } from '@polotno/pptx-export';
import { Button } from 'polotno/primitives';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});

const page = store.addPage();
page.addElement({
  type: 'text',
  x: store.width / 2 - 200,
  width: 400,
  y: 400,
  fontSize: 60,
  fontFamily: 'Arial',
  text: 'Try to add a template and export it to PPTX',
});

async function exportToPPTX() {
  const json = store.toJSON();
  await jsonToPPTX({ json, output: 'design.pptx' });
}

export const App = () => {
  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} defaultSection="" />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar
          store={store}
          downloadButtonEnabled
          components={{
            ActionControls: () => (
              <Button
                variant="ghost"
                onClick={exportToPPTX}
                style={{ marginLeft: 'auto' }}
              >
                Export to PPTX
              </Button>
            ),
          }}
        />
        <Workspace store={store} />
        <ZoomButtons store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
