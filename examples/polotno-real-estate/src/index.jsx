import React from 'react';
import ReactDOM from 'react-dom/client';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';

import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS, SectionTab } from 'polotno/side-panel';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { Workspace } from 'polotno/canvas/workspace';
import { Tooltip } from 'polotno/canvas/tooltip';
import {
  Button,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from 'polotno/primitives';
import { createStore } from 'polotno/model/store';
import { setTextOverflow, setAnimationsEnabled } from 'polotno/config';

import { getImageSize, getCrop } from 'polotno/utils/image';

import Topbar from './topbar';
import { EditImageSection } from './edit-image-section';
import { QrSection } from './qr-section';
import { VideoSection } from './video-section';
import { PhotosSection } from './photos-section';

import './index.css';

setAnimationsEnabled(true);

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});
window.store = store;

const page = store.addPage();

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

const IconsIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g>
      <path
        d="M3.75 12H2.25V20.25C2.25 21.0784 2.92155 21.75 3.75 21.75H9.75V20.25H3.75V12Z"
        fill="white"
      />
      <path
        d="M21 21.75H12.75C12.4849 21.75 12.2393 21.6101 12.1044 21.3817C12.0349 21.2641 12 21.1321 12 21C12 20.8757 12.0309 20.7512 12.0929 20.6386L16.2179 13.1386C16.3602 12.8798 16.6178 12.7502 16.875 12.75C17.1326 12.7498 17.3896 12.8793 17.5321 13.1386L21.6572 20.6386C21.7191 20.7512 21.75 20.8757 21.75 21C21.75 21.1321 21.7151 21.2641 21.6456 21.3817C21.5107 21.61 21.2651 21.75 21 21.75ZM14.0184 20.25H19.7317L16.8751 15.0563L14.0184 20.25Z"
        fill="white"
      />
      <path
        d="M20.25 2.25H12V3.75H20.25V14.2442H21.75V3.75C21.75 2.92162 21.0785 2.25 20.25 2.25Z"
        fill="white"
      />
      <path
        d="M8.25 2.25H3.75C2.92155 2.25 2.25 2.92162 2.25 3.75V8.25C2.25 9.07837 2.92155 9.75 3.75 9.75H8.25C9.07845 9.75 9.75 9.07837 9.75 8.25V3.75C9.75 2.92162 9.07845 2.25 8.25 2.25ZM8.25 8.25H3.75V3.75H8.25V8.25Z"
        fill="white"
      />
    </g>
  </svg>
);

async function applyListingToTemplate(templateJson, listing) {
  const json = JSON.parse(JSON.stringify(templateJson));
  const imageUpdates = [];

  json.pages.forEach((page) => {
    page.children.forEach((child) => {
      const variable = child.custom?.variable;
      if (!variable) return;
      switch (variable) {
        case 'price':
          child.text = listing.price;
          break;
        case 'address':
          if (child.text?.includes('•')) {
            child.text = child.text.replace(
              /^.*?•\s*.*/s,
              listing.propertyType + ' • ' + listing.address,
            );
          } else {
            child.text = listing.address;
          }
          break;
        case 'listingType':
          if (child.text?.includes('•')) {
            child.text = listing.listingType + ' • ' + listing.propertyType;
          } else {
            child.text = listing.listingType;
          }
          break;
        case 'beds':
          child.text = String(listing.beds);
          break;
        case 'baths':
          child.text = String(listing.baths);
          break;
        case 'sqft':
          child.text = listing.sqft.toLocaleString();
          break;
        case 'agentName':
          child.text = listing.agentName;
          break;
        case 'agentInfo':
          child.text = child.text
            .replace(/Jessica Porter/g, listing.agentName)
            .replace(/\(619\) 840-0210/g, listing.agentPhone)
            .replace(/jess@coldwell\.com/g, listing.agentEmail);
          break;
        case 'legalDisclaimer':
          child.text = listing.legalDisclaimer;
          break;
        default:
          if (variable.startsWith('photo')) {
            const idx = parseInt(variable.replace('photo', '')) - 1;
            if (listing.images[idx]) {
              const base = new URL('./listings/', window.location.href).href;
              const src = base + listing.images[idx];
              child.src = src;
              imageUpdates.push({ child, src });
            }
          }
          break;
      }
    });
  });

  // Compute center-focused crops for replaced images
  await Promise.all(
    imageUpdates.map(async ({ child, src }) => {
      try {
        const { width, height } = await getImageSize(src);
        const crop = getCrop(
          { width: child.width, height: child.height },
          { width, height },
        );
        Object.assign(child, crop);
      } catch (e) {
        // Fallback: reset crop to show full image
        child.cropX = 0;
        child.cropY = 0;
        child.cropWidth = 1;
        child.cropHeight = 1;
      }
    }),
  );

  return json;
}

const TemplatesPanel = observer(({ store }) => {
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [listings, setListings] = React.useState([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [templateJson, setTemplateJson] = React.useState(null);
  const [selectedListingIndex, setSelectedListingIndex] = React.useState('');
  const [loadingTemplate, setLoadingTemplate] = React.useState(false);

  React.useEffect(() => {
    fetch('./templates/index.json')
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      });
    fetch('./listings/listing.json')
      .then((res) => res.json())
      .then((data) => {
        setListings(data);
      });
  }, []);

  if (selectedTemplate) {
    return (
      <div className="drill-down-panel">
        <div className="drill-down-header">
          <button
            className="back-button"
            onClick={() => {
              setSelectedTemplate(null);
              setTemplateJson(null);
              setSelectedListingIndex('');
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M15 9H3M3 9L8 4M3 9L8 14"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="title">Choose a listing</span>
          <button
            className="close-button"
            onClick={() => {
              setSelectedTemplate(null);
              setTemplateJson(null);
              setSelectedListingIndex('');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
              <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" />
            </svg>
          </button>
        </div>
        <div className="drill-down-body">
          <label>Listing</label>
          <Select
            value={
              selectedListingIndex === '' ? undefined : String(selectedListingIndex)
            }
            onValueChange={(v) => setSelectedListingIndex(v)}
          >
            <SelectTrigger style={{ width: '100%' }}>
              <SelectValue placeholder="Choose listing" />
            </SelectTrigger>
            <SelectContent>
              {listings.map((l, i) => (
                <SelectItem key={i} value={String(i)}>
                  {l.listing}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="run-button"
            disabled={selectedListingIndex === ''}
            onClick={async () => {
              const listing = listings[parseInt(selectedListingIndex)];
              if (listing && templateJson) {
                const modified = await applyListingToTemplate(
                  templateJson,
                  listing,
                );
                setTextOverflow('change-font-size');
                store.loadJSON(modified);
                await store.waitLoading();
                setTextOverflow('resize');
              }
            }}
          >
            Run
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {loadingTemplate && (
        <div className="template-loading-overlay">
          <div className="template-loading-spinner" />
          <span>Loading template…</span>
        </div>
      )}
      <ImagesGrid
        shadowEnabled={false}
        images={templates}
        getPreview={(item) => `./templates/${item.preview}`}
        isLoading={loading}
        onSelect={async (item) => {
          setLoadingTemplate(true);
          try {
            const req = await fetch(`./templates/${item.json}`);
            const json = await req.json();
            store.loadJSON(json);
            await store.waitLoading();
            setTemplateJson(json);
            setSelectedTemplate(item);
          } finally {
            setLoadingTemplate(false);
          }
        }}
        rowsNumber={2}
      />
    </div>
  );
});

const TemplatesSection = {
  name: 'templates',
  Tab: (props) => (
    <SectionTab name="Templates" {...props}>
      <TemplatesIcon />
    </SectionTab>
  ),
  Panel: TemplatesPanel,
};

DEFAULT_SECTIONS.find((s) => s.name === 'text').Tab = (props) => (
  <SectionTab name="Text" {...props}>
    <TextIcon />
  </SectionTab>
);

const sections = [
  TemplatesSection,
  DEFAULT_SECTIONS.find((s) => s.name === 'text'),
  PhotosSection,
  VideoSection,
  {
    name: 'icons',
    Tab: (props) => (
      <SectionTab name="Elements" {...props}>
        <IconsIcon />
      </SectionTab>
    ),
    Panel: DEFAULT_SECTIONS.find((s) => s.name === 'elements')?.Panel,
  },
  QrSection,
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
  },
);

const EditIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16.474 5.408l2.118 2.117m-.756-3.982L12.109 9.27a2.118 2.118 0 00-.58 1.082L11 13l2.648-.53c.41-.082.786-.283 1.082-.579l5.727-5.727a1.853 1.853 0 10-2.621-2.621z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 21h14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ImageEditButton = observer(({ store }) => {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => store.openSidePanel('edit-image')}
    >
      <EditIcon />
      Edit Image
    </Button>
  );
});

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
            <Toolbar store={store} components={{ ImageEditButton }} />
            <Workspace
              store={store}
              components={{
                Tooltip,
                ImageEditButton,
              }}
            />
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
