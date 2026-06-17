import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { PagesTimeline } from 'polotno/pages-timeline';
import { createStore } from 'polotno/model/store';
import { observer } from 'mobx-react-lite';
import { Button } from 'polotno/primitives';

import { setAnimationsEnabled } from 'polotno/config';
setAnimationsEnabled(true);

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});

store.addPage();

function addSampleAudio() {
  store.addAudio({
    src: 'https://cdn.pixabay.com/download/audio/2023/08/26/audio_a6ee15a317.mp3?filename=sunflower-street-drumloop-85bpm-163900.mp3',
    volume: 0.5,
    delay: 0,
  });
}

function removeAllAudio() {
  const audioIds = store.audios.map(a => a.id);
  audioIds.forEach(id => store.removeAudio(id));
}

const AudioControls = observer(() => {
  const hasAudio = store.audios.length > 0;

  return (
    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
      {!hasAudio ? (
        <Button variant="ghost" onClick={addSampleAudio}>
          Add Audio
        </Button>
      ) : (
        <Button variant="ghost" onClick={removeAllAudio}>
          Remove Audio
        </Button>
      )}
    </div>
  );
});

export const App = () => {
  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} defaultSection="none" />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar
          store={store}
          components={{
            ActionControls: AudioControls,
          }}
        />
        <Workspace store={store} />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} defaultOpened />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
