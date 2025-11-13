import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Tooltip } from 'polotno/canvas/tooltip';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { useInfiniteAPI } from 'polotno/utils/use-api';
import { getImageSize } from 'polotno/utils/image';
import { Button, Menu, MenuItem, Popover } from '@blueprintjs/core';

import '@blueprintjs/core/lib/css/blueprint.css';

import { createStore } from 'polotno/model/store';

const useViewportHeight = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const previousBodyMargin = body.style.margin;
    const previousBodyBackground = body.style.background;

    body.style.margin = '0';
    body.style.background = '#fff';

    const updateHeight = () => {
      const height =
        window.visualViewport?.height ??
        window.innerHeight ??
        window.screen.height;
      root.style.setProperty('--app-height', `${height}px`);
    };

    updateHeight();

    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    window.visualViewport?.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
      window.visualViewport?.removeEventListener('resize', updateHeight);
      root.style.removeProperty('--app-height');
      body.style.margin = previousBodyMargin;
      body.style.background = previousBodyBackground;
    };
  }, []);
};

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});
store.setSize(1000, 1000);
const frontPage = store.addPage();

frontPage.addElement({
  type: 'svg',
  src: './front.svg',
  name: 'front-background-svg',
  width: 2500,
  height: 2500,
  x: -750,
  y: -400,
  showInExport: false,
  selectable: false,
});

const backPage = store.addPage();

backPage.addElement({
  type: 'svg',
  src: './back.svg',
  name: 'back-background-svg',
  width: 2500,
  height: 2500,
  x: -750,
  y: -400,
  showInExport: false,
  selectable: false,
});

store.selectPage(frontPage.id);

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = src;
  });

// Add a placeholder image to the front page
const placeholderImage = frontPage.addElement(
  {
    type: 'image',
    src: 'https://placehold.co/400x400?text=Click+to+add+image',
    x: 20,
    y: 20,
    width: store.width - 40,
    height: 400,
    removable: false,
    draggable: false,
    resizable: false,
    cropY: 0.3,
    custom: {
      isPlaceholder: true,
    },
  },
  {
    skipSelect: true,
  }
);

// Create custom photos panel limited to 3 photos
const LimitedPhotosPanel = observer(({ store }: { store: any }) => {
  // Use the default photos API but limit results
  const { data, isLoading, setQuery } = useInfiniteAPI({
    defaultQuery: '',
    getAPI: ({ page, query }: { page: number; query: string }) => {
      const key = 'nFA5H9elEytDyPyvKL7T';
      const API = 'https://api.polotno.com/api';
      return `${API}/get-pexels?query=${encodeURIComponent(
        query || ''
      )}&per_page=6&page=${page}&KEY=${key}`;
    },
    getSize: () => 1, // Only load first page (3 photos)
  });

  const images = data?.[0]?.photos?.slice(0, 6) || [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ImagesGrid
        images={images}
        getPreview={(image: any) => image.src.medium}
        onSelect={async (
          image: any,
          pos?: { x: number; y: number },
          element?: any
        ) => {
          const src = image.src.large;
          const { width, height } = await getImageSize(src);
          if (element) {
            element.set({
              src,
            });
            return;
          } else {
            store.activePage?.addElement({
              type: 'image',
              src,
              width,
              height,
              x: (pos?.x || store.width / 2) - width / 2,
              y: (pos?.y || store.height / 2) - height / 2,
            });
          }
        }}
        isLoading={isLoading}
        loadMore={false}
        shadowEnabled={false}
        rowsNumber={2}
      />
    </div>
  );
});

const PhotosSection = DEFAULT_SECTIONS.find(
  (section) => section.name === 'photos'
);
if (PhotosSection) {
  PhotosSection.Panel = LimitedPhotosPanel;
}

// Filter out unwanted side panel sections and replace photos with limited version
const filteredSections = DEFAULT_SECTIONS.filter(
  (section) =>
    section.name !== 'upload' &&
    section.name !== 'size' &&
    section.name !== 'background' &&
    section.name !== 'templates' &&
    section.name !== 'layers' &&
    section.name !== 'draw'
);

// Image placeholder replacement component
const ImageReplaceButton = observer(({ element }: { element: any }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataURL = loadEvent.target?.result as string;
      element.set({
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        src: dataURL,
        custom: { isPlaceholder: false },
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <>
      <Button
        text="Replace Image"
        onClick={() => {
          fileInputRef.current?.click();
        }}
        minimal
        small
      />
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />
    </>
  );
});

// Custom download button with preview and print options
const CustomDownloadButton = observer(({ store }: { store: any }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadPrint = useCallback(async () => {
    setIsProcessing(true);
    try {
      await store.saveAsImage({
        pageId: store.activePage?.id,
        pixelRatio: 2,
        mimeType: 'image/png',
      });
    } catch (error) {
      console.error('Failed to download print export.', error);
    } finally {
      setIsProcessing(false);
    }
  }, [store]);

  const handleDownloadPreview = useCallback(async () => {
    const page = store.activePage;
    if (!page) return;

    const backgroundName =
      page.id === frontPage.id ? 'front-background-svg' : 'back-background-svg';

    const svgElement = page.children?.find(
      (el: any) => el.name === backgroundName
    );

    if (!svgElement) {
      console.warn('No background SVG element found for preview export.');
      return;
    }

    setIsProcessing(true);

    try {
      const { width, height, x, y, src } = svgElement;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to initialize canvas context.');
      }

      const [backgroundImage, designDataUrl] = await Promise.all([
        loadImage(src),
        store.toDataURL({
          pageId: page.id,
          mimeType: 'image/png',
          ignoreBackground: true,
        }),
      ]);

      if (!designDataUrl) {
        throw new Error('Received empty data URL for design export.');
      }

      context.clearRect(0, 0, width, height);
      context.drawImage(backgroundImage, 0, 0, width, height);

      const designImage = await loadImage(designDataUrl);
      context.drawImage(designImage, -x, -y);

      const pageIndex = store.pages.indexOf(page);
      const fileLabel = pageIndex === 0 ? 'front' : 'back';

      const link = document.createElement('a');
      link.download = `${fileLabel}-preview.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download preview export.', error);
    } finally {
      setIsProcessing(false);
    }
  }, [store]);

  return (
    <Popover
      minimal
      disabled={isProcessing}
      content={
        <Menu>
          <MenuItem
            text="Download preview"
            onClick={handleDownloadPreview}
            disabled={isProcessing}
          />
          <MenuItem
            text="Download print"
            onClick={handleDownloadPrint}
            disabled={isProcessing}
          />
        </Menu>
      }
    >
      <Button text="Download" loading={isProcessing} minimal />
    </Popover>
  );
});

// Placeholder image hook
function usePlaceholderSelection(store: any) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const dispose = reaction(
      () => store.selectedElements,
      (selectedElements: any[]) => {
        const placeholder = selectedElements.find(
          (el) => el.custom?.isPlaceholder
        );
        if (placeholder) {
          fileInputRef.current?.click();
        }
      }
    );
    return () => dispose();
  }, [store]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataURL = loadEvent.target?.result as string;
      const placeholder = store.selectedElements.find(
        (el: any) => el.custom?.isPlaceholder
      );
      if (placeholder) {
        placeholder.set({
          src: dataURL,
          custom: { isPlaceholder: false },
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <input
      ref={fileInputRef}
      type="file"
      style={{ display: 'none' }}
      accept="image/*"
      onChange={handleFileChange}
    />
  );
}

const PageControls = observer(
  ({
    store,
    page,
    xPadding,
    yPadding,
    width,
    height,
    ...props
  }: {
    store: any;
    page: any;
    xPadding: number;
    yPadding: number;
    width: number;
    height: number;
  }) => {
    return (
      <div
        style={{
          position: 'absolute',
          top: yPadding - 150 + 'px', // Position above the page container
          left: xPadding + (page.computedWidth * store.scale) / 2 + 'px',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          gap: '8px',
        }}
      >
        <Button
          active={store.pages.indexOf(store.activePage) === 0}
          onClick={() => {
            store.selectPage(store.pages[0].id);
          }}
        >
          Front
        </Button>
        <Button
          active={store.pages.indexOf(store.activePage) === 1}
          onClick={() => {
            store.selectPage(store.pages[1].id);
          }}
        >
          Back
        </Button>
      </div>
    );
  }
);

function App() {
  // Center and scale down canvas on load
  useViewportHeight();

  useEffect(() => {
    // Get the actual workspace element
    const workspace = document.querySelector(
      '.polotno-workspace-container'
    ) as HTMLElement;

    // Calculate SVG bounds (the t-shirt SVG extends beyond the page)
    // SVG is positioned at x: -750, y: -400 with size 2500x2500
    const svgLeft = -750;
    const svgTop = -400;
    const svgWidth = 2500;
    const svgHeight = 2500;
    const svgRight = svgLeft + svgWidth;
    const svgBottom = svgTop + svgHeight;

    // Calculate the bounding box of the SVG
    const svgBoundsWidth = svgRight - svgLeft;
    const svgBoundsHeight = svgBottom - svgTop;

    // Use actual workspace dimensions
    const workspaceWidth = workspace.clientWidth;
    const workspaceHeight = workspace.clientHeight;

    // Available space after padding
    const availableWidth = workspaceWidth;
    const availableHeight = workspaceHeight;

    // Calculate scale to fit SVG within available workspace
    const scaleX = availableWidth / svgBoundsWidth;
    const scaleY = availableHeight / svgBoundsHeight;
    const scale = Math.min(scaleX, scaleY);

    // Only set scale if it's positive and valid
    if (scale > 0 && isFinite(scale)) {
      store.setScale(scale);
    }
  }, []);

  // Close side panel by default
  useEffect(() => {
    store.openSidePanel('');
  }, []);

  const fileInput = usePlaceholderSelection(store);

  return (
    <PolotnoContainer
      style={{
        width: '100%',
        height: 'var(--app-height, 100vh)',
        minHeight: '100dvh',
        backgroundColor: '#fff',
      }}
    >
      <SidePanelWrap>
        <SidePanel
          store={store}
          sections={filteredSections}
          defaultSection=""
        />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar
          store={store}
          components={{
            ActionControls: CustomDownloadButton,
            Position: () => null,
            Opacity: () => null,
            Lock: () => null,
            Duplicate: () => null,
            Remove: () => null,
            CopyStyle: () => null,
          }}
        />
        <Workspace
          store={store}
          renderOnlyActivePage
          components={{
            PageControls,
            Tooltip,
            ImageActionButton: ImageReplaceButton,
          }}
          paddingX={100}
          paddingY={100}
          backgroundColor="transparent"
        />
        <ZoomButtons store={store} />
        {fileInput}
      </WorkspaceWrap>
    </PolotnoContainer>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
