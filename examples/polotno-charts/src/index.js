import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';

import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';
import { ChartSection, getChart } from './ChartSection';

// import all default sections
import { DEFAULT_SECTIONS } from 'polotno/side-panel';

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
// add to global namespace for debugging
window.store = store;

// add page and element instantly
store.addPage();

// add sample data
// const val = 'https://polotno.com/';
getChart({ data: [[25, 40, 10]], type: 'pie' }).then((src) => {
  store.activePage.addElement({
    type: 'svg',
    name: 'chart',
    x: store.width / 2 - 150,
    y: store.height / 2 - 150,
    width: 400,
    height: 300,
    src,
    custom: {
      data: [25, 40],
    },
  });
});

// we will have just two sections
const sections = [ChartSection, ...DEFAULT_SECTIONS];

export const App = () => {
  return (
    <PolotnoContainer className="polotno-app-container">
      <SidePanelWrap>
        <SidePanel store={store} sections={sections} defaultSection="charts" />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} />
        <Workspace store={store} />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
