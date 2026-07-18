import React from 'react';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { Button } from 'polotno/primitives';
import 'polotno/ui.css';
import '../../shared/studio-theme.css';
import template from './template.json';

// An image-focused editor. Animations are deliberately left OFF, so Polotno never
// inserts its Videos/Animations side-panel sections. DEFAULT_SECTIONS is already
// image-only — Templates, Text, Photos, Elements, Draw, Upload, Background, Layers,
// Resize — so we use it as-is.
const store = createStore({ key: 'HyhTCjrrUThWw9E7dO_y', showCredit: false });
window.store = store;

// Start on a real design rather than a blank page — a template pulled from the
// Polotno templates library, so the editor has something to edit on open.
store.loadJSON(template);

// --- download ------------------------------------------------------------

// The full still-image format set that polotno.com/studio offers, all client-side.
// (Video/GIF are motion-only and belong in the video editor; PDF here is raster via
// the store — the vector path lives in the postcard demo.)
function downloadJSON() {
  const blob = new Blob([JSON.stringify(store.toJSON(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'design.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const FORMATS = [
  { label: 'PNG image', run: () => store.saveAsImage({ fileName: 'design.png' }) },
  {
    label: 'JPEG image',
    run: () => store.saveAsImage({ fileName: 'design.jpeg', mimeType: 'image/jpeg' }),
  },
  { label: 'PDF document', run: () => store.saveAsPDF({ fileName: 'design.pdf' }) },
  { label: 'SVG vector', run: () => store.saveAsSVG({ fileName: 'design.svg' }) },
  { label: 'HTML', run: () => store.saveAsHTML({ fileName: 'design.html' }) },
  { label: 'JSON', run: downloadJSON },
];

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

// Hand-rolled dropdown. The menu is rendered through a portal to <body> with
// position:fixed — the Polotno toolbar clips its overflow (`overflow-y:hidden`), so an
// in-flow absolute dropdown would be invisible/unclickable below the bar. Anchoring a
// fixed portal to the button's bounding box escapes that clip entirely.
function DownloadMenu() {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const pick = async (fmt) => {
    setOpen(false);
    try {
      await store.waitLoading();
      await fmt.run();
    } catch (e) {
      console.error('export failed', e);
    }
  };

  return (
    <>
      <Button
        ref={btnRef}
        onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}
      >
        <DownloadIcon /> Download
      </Button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              zIndex: 9999,
              minWidth: 190,
              padding: 4,
              background: 'var(--popover, #fff)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 24px rgba(22,22,22,0.16)',
            }}
          >
            {FORMATS.map((fmt) => (
              <button
                key={fmt.label}
                onClick={() => pick(fmt)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  color: 'var(--foreground)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {fmt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export const App = () => {
  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} sections={DEFAULT_SECTIONS} defaultSection="photos" />
      </SidePanelWrap>
      <WorkspaceWrap>
        {/* Replace Polotno's default (image + PDF only) download with the full studio
            format set. */}
        <Toolbar
          store={store}
          downloadButtonEnabled={false}
          components={{ ActionControls: DownloadMenu }}
        />
        {/* Extra padding around the page so the design loads zoomed-out with
            breathing room, instead of the auto-fit filling the whole canvas. */}
        <Workspace store={store} backgroundColor="#f4f4f4" paddingX={110} paddingY={110} />
        <ZoomButtons store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App store={store} />);
