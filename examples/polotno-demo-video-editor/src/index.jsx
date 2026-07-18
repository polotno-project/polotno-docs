import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { PagesTimeline } from 'polotno/pages-timeline';
import {
  SidePanel,
  TemplatesSection,
  TextSection,
  VideosSection,
  ElementsSection,
  UploadSection,
  BackgroundSection,
  LayersSection,
  SizeSection,
} from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { setAnimationsEnabled } from 'polotno/config';
import { Button } from 'polotno/primitives';
import { storeToVideo } from '@polotno/video-export';
import 'polotno/ui.css';
import '../../shared/studio-theme.css';
import template from './template.json';

// A video-focused editor. Turning animations on makes Polotno surface the Videos and
// Animations sections and the timeline; we then build the section list by hand and
// drop the stock Photos section so the whole surface reads as "video, not stills".
setAnimationsEnabled(true);

const store = createStore({ key: 'HyhTCjrrUThWw9E7dO_y', showCredit: false });
window.store = store;

// Photos (stock still images) is intentionally omitted. The Animations section is added
// automatically by SidePanel because animations are enabled.
const sections = [
  TemplatesSection,
  TextSection,
  VideosSection,
  ElementsSection,
  UploadSection,
  BackgroundSection,
  LayersSection,
  SizeSection,
];

// Open on a real multi-page video design (animated headings + stock clips over timed
// pages) so the editor and timeline have something to show on load.
store.loadJSON(template);

// --- video export --------------------------------------------------------

function VideoExportButton() {
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const run = async () => {
    setBusy(true);
    setProgress(0);
    try {
      await store.waitLoading();
      const blob = await storeToVideo({
        store,
        fps: 30,
        pixelRatio: 1,
        onProgress: (p) => setProgress(p),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'video.mp4';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('video export failed', e);
      alert('Video export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={run} disabled={busy} style={{ marginLeft: 'auto' }}>
      {busy ? `Exporting… ${Math.round(progress * 100)}%` : 'Export video'}
    </Button>
  );
}

export const App = () => {
  // The Workspace auto-fits the page to the space left over after the timeline opens,
  // which collapses the canvas in a short viewport. Set a prominent fixed zoom once the
  // workspace has mounted (double rAF runs after Polotno's mount-time auto-fit) so the
  // canvas leads regardless of window height.
  React.useEffect(() => {
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      store.setScale(0.35);
      // Scroll the canvas to the first page so it leads (loadJSON can leave the
      // view on the last page).
      if (store.pages.length) store.selectPage(store.pages[0].id);
    };
    // Apply once the workspace has mounted (double rAF runs after Polotno's
    // mount-time auto-fit), then again after the videos finish loading — that
    // re-lays out the workspace and would otherwise scroll off the first page.
    const raf = requestAnimationFrame(() => requestAnimationFrame(apply));
    store.waitLoading().then(() => requestAnimationFrame(apply));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        {/* Start with no panel open — the design is already loaded, so the canvas
            and timeline lead instead of the stock-video grid. */}
        <SidePanel store={store} sections={sections} defaultSection="" />
      </SidePanelWrap>
      <WorkspaceWrap>
        {/* Keep the default (image) download button off — video export is the
            primary output here and lives in ActionControls. */}
        <Toolbar
          store={store}
          downloadButtonEnabled={false}
          components={{ ActionControls: VideoExportButton }}
        />
        {/* Show one page at a time (the active one) — the timeline switches pages.
            Avoids the all-pages-stacked scroll landing off the first page. */}
        <Workspace store={store} backgroundColor="#f4f4f4" renderOnlyActivePage />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} defaultOpened />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App store={store} />);
