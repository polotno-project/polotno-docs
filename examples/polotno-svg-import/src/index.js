import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { svgToJson } from '@polotno/svg-import';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});
store.addPage();

const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const svgContent = await file.text();
  const json = await svgToJson({ svg: svgContent });
  store.loadJSON(json);
};

const App = ({ store }) => {
  const inputRef = React.useRef(null);

  return (
    <PolotnoContainer className="bp5-scope" style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} />
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
                  accept=".svg"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  className="bp5-button bp5-intent-primary"
                  onClick={() => inputRef.current?.click()}
                >
                  Import SVG
                </button>
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
