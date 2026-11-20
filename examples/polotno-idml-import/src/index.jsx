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
import { idmlToJson } from '@polotno/idml-import';

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
      const json = await idmlToJson({
        // An .idml, or a .zip of the folder File > Package writes: the
        // importer then reads the linked pictures and the fonts from it.
        idml: await file.arrayBuffer(),
        // What the importer approximated or dropped, e.g. a substituted font.
        onWarning: (w) => console.warn(w.code, w.message, w.details),
      });
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
                  accept=".idml,.zip"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <Button
                  disabled={loading}
                  onClick={() => inputRef.current?.click()}
                >
                  {loading ? 'Importing...' : 'Import IDML'}
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
