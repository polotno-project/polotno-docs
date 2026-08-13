import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Button,
  Navbar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
  FieldRow,
  Separator,
  Spinner,
} from 'polotno/primitives';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';
import { setRichTextEnabled } from 'polotno/config';
import { jsonToPDFBlob } from '@polotno/pdf-export/browser';
// ISO Coated v2 (based on FOGRA39) — the ICC printing condition PDF/X embeds
// as its output intent. Loaded lazily, only when a print-ready export runs.
import iccUrl from './ISOcoated_v2_eci.icc?url';

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

// Seed a small starter design so the export button is useful immediately.
store.addPage();
store.activePage.addElement({
  type: 'figure',
  subType: 'rect',
  x: 0,
  y: 0,
  width: 1080,
  height: 120,
  fill: '#0F766E',
});
store.activePage.addElement({
  type: 'text',
  text: 'PDF export',
  x: 80,
  y: 220,
  width: 850,
  fontSize: 72,
  fontFamily: 'Roboto',
  fill: '#1F2937',
  align: 'center',
});
store.activePage.addElement({
  type: 'text',
  text: 'Pick your options under Download PDF →',
  x: 80,
  y: 340,
  width: 850,
  fontSize: 28,
  fontFamily: 'Roboto',
  fill: '#6B7280',
  align: 'center',
});
store.selectElements([]);

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

// The output-intent profile is ~1.8MB, so fetch it once and keep it.
let iccProfile = null;
async function loadIccProfile() {
  if (!iccProfile) {
    const response = await fetch(iccUrl);
    iccProfile = new Uint8Array(await response.arrayBuffer());
  }
  return iccProfile;
}

const captionFor = ({ flatten, printReady, cmyk }) => {
  if (flatten) {
    return 'Each page is rasterized into the PDF — exact canvas match, bigger file.';
  }
  if (printReady && cmyk) {
    return 'PDF/X-4 with all colors converted to CMYK through ISO Coated v2 (FOGRA39).';
  }
  if (printReady) {
    return 'PDF/X-4 with an ISO Coated v2 (FOGRA39) output intent. Text stays selectable.';
  }
  return 'Vector PDF — selectable text, resolution-independent, small file.';
};

const ExportButton = ({ store }) => {
  const [flatten, setFlatten] = React.useState(false);
  const [printReady, setPrintReady] = React.useState(false);
  const [cmyk, setCmyk] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const exportPDF = async () => {
    setExporting(true);
    try {
      if (flatten) {
        // Raster path, built into Polotno: every page becomes an image.
        await store.saveAsPDF({ fileName: 'design.pdf' });
        return;
      }
      const attrs = {};
      if (printReady) {
        attrs.pdfx = 'x-4';
        attrs.outputIntent = {
          profile: await loadIccProfile(),
          identifier: 'FOGRA39',
        };
        if (cmyk) {
          attrs.colorMode = 'cmyk';
        }
      }
      const blob = await jsonToPDFBlob(store.toJSON(), attrs);
      triggerDownload(blob, 'design.pdf');
    } catch (err) {
      console.error(err);
      alert(
        'Export failed: ' + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button>Download PDF</Button>} />
      <PopoverContent align="end">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FieldRow label="Flatten pages (bitmap)">
            <Switch checked={flatten} onCheckedChange={setFlatten} />
          </FieldRow>
          <FieldRow label="Print-ready (PDF/X-4)">
            <Switch
              checked={printReady}
              onCheckedChange={setPrintReady}
              disabled={flatten}
            />
          </FieldRow>
          <FieldRow label="CMYK colors">
            <Switch
              checked={cmyk}
              onCheckedChange={setCmyk}
              disabled={flatten || !printReady}
            />
          </FieldRow>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            {captionFor({ flatten, printReady: !flatten && printReady, cmyk })}
          </p>
          <Separator />
          <Button
            onClick={exportPDF}
            disabled={exporting}
            style={{ width: '100%' }}
          >
            {exporting ? <Spinner /> : null}
            {exporting ? 'Exporting…' : 'Download PDF'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const Topbar = ({ store }) => {
  return (
    <Navbar>
      <Navbar.Group align="left">
        <div style={{ fontWeight: 600, padding: '0 8px' }}>PDF export</div>
      </Navbar.Group>
      <Navbar.Group align="right">
        <ExportButton store={store} />
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
