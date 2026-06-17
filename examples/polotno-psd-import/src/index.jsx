import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Button } from 'polotno/primitives';
import { createStore } from 'polotno/model/store';
import { psdToJson } from '@polotno/psd-import';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});
store.addPage();

const App = ({ store }) => {
  const inputRef = React.useRef(null);
  const [loading, setLoading] = React.useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const json = await psdToJson({ psd: buffer });
      store.loadJSON(json);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

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
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".psd"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <Button
                  disabled={loading}
                  onClick={() => inputRef.current?.click()}
                >
                  {loading ? 'Importing...' : 'Import PSD'}
                </Button>
              </>
            ),
          }}
        />
        <Workspace store={store} />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
