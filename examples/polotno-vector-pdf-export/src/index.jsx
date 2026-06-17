import React from 'react';
import ReactDOM from 'react-dom/client';
import { Button, Navbar } from 'polotno/primitives';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';
import { setRichTextEnabled } from 'polotno/config';
import { jsonToPDFBlob } from '@polotno/pdf-export/browser';

// Enable rich text rendering before any store is created so imported
// designs with inline formatting (bold, color, italic spans) render
// correctly in the editor and in PDF export.
setRichTextEnabled(true);

// create store
const store = createStore({
  // demo key — please use your own in production projects
  // https://polotno.com/cabinet
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});

// Seed a small starter design so the export buttons are useful immediately.
store.addPage();
store.activePage.addElement({
  type: 'text',
  text: 'Vector vs Bitmap PDF',
  x: 80,
  y: 200,
  width: 850,
  fontSize: 60,
  fontFamily: 'Roboto',
  fill: '#1F2937',
  align: 'center',
});
store.activePage.addElement({
  type: 'text',
  text: 'Try both export options →',
  x: 80,
  y: 320,
  width: 850,
  fontSize: 28,
  fontFamily: 'Roboto',
  fill: '#6B7280',
  align: 'center',
});

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const Topbar = ({ store }) => {
  const [exporting, setExporting] = React.useState(null);

  // Bitmap path: each page is rasterised into the PDF as a flattened
  // image. Identical to the canvas, larger files, fixed resolution.
  // Built into Polotno; no extra package needed.
  const exportBitmap = async () => {
    setExporting('bitmap');
    try {
      await store.saveAsPDF({ fileName: 'design.pdf' });
    } finally {
      setExporting(null);
    }
  };

  // Vector path: paths/strokes/text remain real PDF objects, text stays
  // selectable, file size scales with content (not resolution). Produced
  // by @polotno/pdf-export — fully client-side, no server required.
  const exportVector = async () => {
    setExporting('vector');
    try {
      const blob = await jsonToPDFBlob(store.toJSON());
      triggerDownload(blob, 'design.pdf');
    } catch (err) {
      console.error(err);
      alert(
        'Vector export failed: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <Navbar>
      <Navbar.Group align="left">
        <div style={{ fontWeight: 600, padding: '0 8px' }}>
          PDF export — bitmap vs vector
        </div>
      </Navbar.Group>
      <Navbar.Group align="right">
        <Button
          onClick={exportBitmap}
          disabled={exporting !== null}
        >
          Export bitmap PDF
        </Button>
        <Button
          onClick={exportVector}
          disabled={exporting !== null}
          style={{ marginLeft: '8px' }}
        >
          Export vector PDF
        </Button>
      </Navbar.Group>
    </Navbar>
  );
};

export const App = () => {
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
      <div style={{ height: 'calc(100% - 50px)' }}>
        <PolotnoContainer className="polotno-app-container">
          <SidePanelWrap>
            <SidePanel store={store} />
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar store={store} downloadButtonEnabled={false} />
            <Workspace store={store} />
            <ZoomButtons store={store} />
            <PagesTimeline store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
