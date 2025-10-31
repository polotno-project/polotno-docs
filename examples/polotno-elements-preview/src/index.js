import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';

import '@blueprintjs/core/lib/css/blueprint.css';

import { createStore } from 'polotno/model/store';
import { SaveTemplateButton } from './save-template-button';
import { TemplatesSection } from './templates-panel';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T', // you can create it here: https://polotno.com/cabinet/
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});
const page = store.addPage();

// Create sections array with custom templates section
const sections = [TemplatesSection, ...DEFAULT_SECTIONS];

export const App = ({ store }) => {
  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel
          store={store}
          sections={sections}
          defaultSection="elements-templates"
        />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store}></Toolbar>
        <Workspace
          store={store}
          components={{
            TextTemplate: SaveTemplateButton,
            ImageTemplate: SaveTemplateButton,
            SvgTemplate: SaveTemplateButton,
            LineTemplate: SaveTemplateButton,
            FigureTemplate: SaveTemplateButton,
            VideoTemplate: SaveTemplateButton,
            ManyTemplate: SaveTemplateButton,
            GroupTemplate: SaveTemplateButton,
          }}
        />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
