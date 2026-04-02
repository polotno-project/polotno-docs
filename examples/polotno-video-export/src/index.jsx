import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { PagesTimeline } from 'polotno/pages-timeline';
import { createStore } from 'polotno/model/store';
import { storeToVideo } from '@polotno/video-export';

import { setAnimationsEnabled } from 'polotno/config';
setAnimationsEnabled(true);

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});

store.openSidePanel('');
store.loadJSON({
    "width": 1080,
    "height": 1080,
    "fonts": [],
    "pages": [
        {
            "id": "4DIU4ekVti",
            "children": [
                {
                    "id": "D0aUQUvNic",
                    "type": "text",
                    "name": "text-1",
                    "opacity": 1,
                    "visible": true,
                    "selectable": true,
                    "removable": true,
                    "alwaysOnTop": false,
                    "showInExport": true,
                    "x": 270,
                    "y": 502,
                    "width": 540,
                    "height": 93,
                    "rotation": 0,
                    "animations": [
                        {
                            "delay": 0,
                            "duration": 1000,
                            "enabled": true,
                            "type": "enter",
                            "name": "fade",
                            "data": {}
                        },
                        {
                            "delay": 0,
                            "duration": 1000,
                            "enabled": true,
                            "type": "exit",
                            "name": "fade",
                            "data": {}
                        }
                    ],
                    "blurEnabled": false,
                    "blurRadius": 10,
                    "brightnessEnabled": false,
                    "brightness": 0,
                    "sepiaEnabled": false,
                    "grayscaleEnabled": false,
                    "filters": {},
                    "shadowEnabled": false,
                    "shadowBlur": 5,
                    "shadowOffsetX": 0,
                    "shadowOffsetY": 0,
                    "shadowColor": "black",
                    "shadowOpacity": 1,
                    "draggable": true,
                    "resizable": true,
                    "contentEditable": true,
                    "styleEditable": true,
                    "text": "I am animated",
                    "placeholder": "",
                    "fontSize": 76,
                    "fontFamily": "Roboto",
                    "fontStyle": "normal",
                    "fontWeight": "normal",
                    "textDecoration": "",
                    "textTransform": "none",
                    "fill": "black",
                    "align": "center",
                    "verticalAlign": "top",
                    "strokeWidth": 0,
                    "stroke": "black",
                    "lineHeight": 1.2,
                    "letterSpacing": 0,
                    "backgroundEnabled": false,
                    "backgroundColor": "#7ED321",
                    "backgroundOpacity": 1,
                    "backgroundCornerRadius": 0.5,
                    "backgroundPadding": 0.5,
                    "curveEnabled": false,
                    "curvePower": 0.5
                }
            ],
            "width": "auto",
            "height": "auto",
            "background": "white",
            "bleed": 0,
            "duration": 3000
        }
    ],
    "audios": [],
    "unit": "px",
    "dpi": 72,
    "schemaVersion": 2
});

async function exportToVideo() {
  try {
    const videoBlob = await storeToVideo({
      store,
      fps: 30,
      pixelRatio: 1,
      onProgress: (progress) => {
        console.log(`Export progress: ${Math.round(progress * 100)}%`);
      },
    });

    // Download the video
    const url = URL.createObjectURL(videoBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'design-video.mp4';
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    alert('Video export failed. Please try again.');
  }
}

export const App = () => {
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
              <button
                className="bp5-button bp5-minimal"
                onClick={exportToVideo}
                style={{ marginLeft: 'auto' }}
              >
                Export to Video
              </button>
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
root.render(<App />);
