import React from 'react';
import ReactDOM from 'react-dom/client';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';

import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import {
  SidePanel,
  DEFAULT_SECTIONS,
  SectionTab,
} from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';

import Topbar from './topbar';
import { EditImageSection } from './edit-image-section';

import './index.css';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});

const page = store.addPage();

page.addElement({
  type: 'image',
  src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
  width: page.computedWidth,
  height: page.computedHeight,
  x: 0,
  y: 0,
});

const TemplatesIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19.5 4.5V7.5H4.5V4.5H19.5ZM19.5 3H4.5C4.10218 3 3.72064 3.15804 3.43934 3.43934C3.15804 3.72064 3 4.10218 3 4.5V7.5C3 7.89782 3.15804 8.27936 3.43934 8.56066C3.72064 8.84196 4.10218 9 4.5 9H19.5C19.8978 9 20.2794 8.84196 20.5607 8.56066C20.842 8.27936 21 7.89782 21 7.5V4.5C21 4.10218 20.842 3.72064 20.5607 3.43934C20.2794 3.15804 19.8978 3 19.5 3Z"
      fill="white"
    />
    <path
      d="M7.5 12V19.5H4.5V12H7.5ZM7.5 10.5H4.5C4.10218 10.5 3.72064 10.658 3.43934 10.9393C3.15804 11.2206 3 11.6022 3 12V19.5C3 19.8978 3.15804 20.2794 3.43934 20.5607C3.72064 20.842 4.10218 21 4.5 21H7.5C7.89782 21 8.27936 20.842 8.56066 20.5607C8.84196 20.2794 9 19.8978 9 19.5V12C9 11.6022 8.84196 11.2206 8.56066 10.9393C8.27936 10.658 7.89782 10.5 7.5 10.5Z"
      fill="white"
    />
    <path
      d="M19.5 12V19.5H12V12H19.5ZM19.5 10.5H12C11.6022 10.5 11.2206 10.658 10.9393 10.9393C10.658 11.2206 10.5 11.6022 10.5 12V19.5C10.5 19.8978 10.658 20.2794 10.9393 20.5607C11.2206 20.842 11.6022 21 12 21H19.5C19.8978 21 20.2794 20.842 20.5607 20.5607C20.842 20.2794 21 19.8978 21 19.5V12C21 11.6022 20.842 11.2206 20.5607 10.9393C20.2794 10.658 19.8978 10.5 19.5 10.5Z"
      fill="white"
    />
  </svg>
);

const TextIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.25 20.25V11.25H13.5V9.75H22.5V11.25H18.75V20.25H17.25Z"
      fill="white"
    />
    <path d="M8.25 20.25V6H1.5V4.5H16.5V6H9.75V20.25H8.25Z" fill="white" />
  </svg>
);

const PhotosIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14.25 10.5C14.695 10.5 15.13 10.368 15.5 10.1208C15.87 9.87357 16.1584 9.52217 16.3287 9.11104C16.499 8.69991 16.5436 8.24751 16.4568 7.81105C16.37 7.37459 16.1557 6.97368 15.841 6.65901C15.5263 6.34434 15.1254 6.13005 14.689 6.04323C14.2525 5.95642 13.8001 6.00097 13.389 6.17127C12.9778 6.34157 12.6264 6.62996 12.3792 6.99997C12.132 7.36998 12 7.80499 12 8.25C12 8.84674 12.2371 9.41903 12.659 9.84099C13.081 10.2629 13.6533 10.5 14.25 10.5Z"
      fill="white"
    />
    <path
      d="M19.5 3H4.5C4.10218 3 3.72064 3.15804 3.43934 3.43934C3.15804 3.72064 3 4.10218 3 4.5V19.5C3 19.8978 3.15804 20.2794 3.43934 20.5607C3.72064 20.842 4.10218 21 4.5 21H19.5C19.8978 21 20.2794 20.842 20.5607 20.5607C20.842 20.2794 21 19.8978 21 19.5V4.5C21 4.10218 20.842 3.72064 20.5607 3.43934C20.2794 3.15804 19.8978 3 19.5 3ZM19.5 19.5H4.5V15L8.25 11.25L12.4425 15.4425C12.7235 15.7219 13.1037 15.8787 13.5 15.8787C13.8963 15.8787 14.2765 15.7219 14.5575 15.4425L15.75 14.25L19.5 18V19.5ZM19.5 15.8775L16.8075 13.185C16.5265 12.9056 16.1463 12.7488 15.75 12.7488C15.3537 12.7488 14.9735 12.9056 14.6925 13.185L13.5 14.3775L9.3075 10.185C9.02646 9.90562 8.64628 9.74881 8.25 9.74881C7.85372 9.74881 7.47354 9.90562 7.1925 10.185L4.5 12.8775V4.5H19.5V15.8775Z"
      fill="white"
    />
  </svg>
);

const VideosIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13.5 11.25H10.5V8.25H9V11.25H6V12.75H9V15.75H10.5V12.75H13.5V11.25Z"
      fill="white"
    />
    <path
      d="M15.75 19.5H3C2.60232 19.4995 2.22105 19.3414 1.93984 19.0602C1.65864 18.779 1.50046 18.3977 1.5 18V6C1.50046 5.60232 1.65864 5.22105 1.93984 4.93984C2.22105 4.65864 2.60232 4.50046 3 4.5H15.75C16.1477 4.50046 16.529 4.65864 16.8102 4.93984C17.0914 5.22105 17.2495 5.60232 17.25 6V9.04245L21.3142 6.13995C21.4263 6.05975 21.5583 6.01201 21.6957 6.00196C21.8332 5.99192 21.9708 6.01996 22.0933 6.08301C22.2159 6.14606 22.3187 6.24167 22.3904 6.35934C22.4622 6.47701 22.5001 6.61218 22.5 6.75V17.25C22.5001 17.3878 22.4622 17.523 22.3904 17.6407C22.3187 17.7584 22.2159 17.854 22.0933 17.9171C21.9708 17.9801 21.8332 18.0082 21.6958 17.9981C21.5583 17.9881 21.4263 17.9403 21.3142 17.8601L17.25 14.9576V18C17.2495 18.3977 17.0914 18.779 16.8102 19.0602C16.529 19.3414 16.1477 19.4995 15.75 19.5ZM3 6V18.0007L15.75 18V13.5C15.7499 13.3622 15.7878 13.227 15.8596 13.1093C15.9313 12.9916 16.0341 12.896 16.1567 12.8329C16.2792 12.7699 16.4168 12.7418 16.5542 12.7519C16.6917 12.7619 16.8237 12.8097 16.9358 12.8899L21 15.7924V8.20755L16.9358 11.1101C16.8237 11.1902 16.6917 11.238 16.5543 11.248C16.4168 11.2581 16.2793 11.23 16.1567 11.167C16.0341 11.1039 15.9313 11.0083 15.8596 10.8907C15.7878 10.773 15.7499 10.6378 15.75 10.5V6H3Z"
      fill="white"
    />
  </svg>
);

const IconsIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
      fill="white"
    />
  </svg>
);

DEFAULT_SECTIONS.find((s) => s.name === 'templates').Tab = (props) => (
  <SectionTab name="Templates" {...props}>
    <TemplatesIcon />
  </SectionTab>
);

DEFAULT_SECTIONS.find((s) => s.name === 'text').Tab = (props) => (
  <SectionTab name="Text" {...props}>
    <TextIcon />
  </SectionTab>
);

DEFAULT_SECTIONS.find((s) => s.name === 'photos').Tab = (props) => (
  <SectionTab name="Photos" {...props}>
    <PhotosIcon />
  </SectionTab>
);

const sections = [
  DEFAULT_SECTIONS.find((s) => s.name === 'templates'),
  DEFAULT_SECTIONS.find((s) => s.name === 'text'),
  DEFAULT_SECTIONS.find((s) => s.name === 'photos'),
  {
    name: 'video',
    Tab: (props) => (
      <SectionTab name="Video" {...props}>
        <VideosIcon />
      </SectionTab>
    ),
    Panel: DEFAULT_SECTIONS.find((s) => s.name === 'photos')?.Panel,
  },
  {
    name: 'icons',
    Tab: (props) => (
      <SectionTab name="Icons" {...props}>
        <IconsIcon />
      </SectionTab>
    ),
    Panel: DEFAULT_SECTIONS.find((s) => s.name === 'elements')?.Panel,
  },
  EditImageSection,
];

let previousSection = 'templates';

reaction(
  () => {
    const selected = store.selectedElements;
    return selected.length === 1 && selected[0]?.type === 'image';
  },
  (hasImage) => {
    if (hasImage) {
      const current = store.openedSidePanel;
      if (current !== 'edit-image') {
        previousSection = current;
      }
      store.openSidePanel('edit-image');
    } else {
      if (store.openedSidePanel === 'edit-image') {
        store.openSidePanel(previousSection || 'templates');
      }
    }
  }
);

export const App = observer(({ store }) => {
  return (
    <div
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
            <SidePanel
              store={store}
              sections={sections}
              defaultSection="templates"
            />
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
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
