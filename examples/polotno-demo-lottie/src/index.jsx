import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { PagesTimeline } from 'polotno/pages-timeline';
import {
  SidePanel,
  TextSection,
  ElementsSection,
  UploadSection,
  BackgroundSection,
  LayersSection,
} from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { setAnimationsEnabled } from 'polotno/config';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  FieldRow,
  ToggleGroup,
  ToggleGroupItem,
  Separator,
} from 'polotno/primitives';
import { storeToVideo } from '@polotno/video-export';
import 'polotno/ui.css';
import '../../shared/studio-theme.css';

// Free animations from the LottieFiles library (Lottie Simple License):
// "Shopping bag" and "Discount" by Mahendra, "Sale" by manju.
import shoppingBagUrl from './lottie/shopping-bag.lottie?url';
import discountUrl from './lottie/discount.lottie?url';
import saleUrl from './lottie/sale.lottie?url';

// Animations on: Polotno shows the timeline and the Animations section, and
// Lottie elements play in the preview.
setAnimationsEnabled(true);

const store = createStore({ key: 'HyhTCjrrUThWw9E7dO_y', showCredit: false });
window.store = store;

// Upload accepts .json and .lottie files next to images and video.
const sections = [
  UploadSection,
  TextSection,
  ElementsSection,
  BackgroundSection,
  LayersSection,
];

// Element src must be absolute so it survives export and copy-paste.
const abs = (url) => new URL(url, window.location.href).href;

// One entrance per element. Text uses the per-letter, per-word and per-line
// presets; every animation sets its easing (a missing one plays linear).
const enter = (name, delay, duration, easing = 'easeOut', data = {}) => ({
  type: 'enter',
  name,
  delay,
  duration,
  easing,
  enabled: true,
  data,
});
// Fade everything out at the end so the MP4 and GIF loop cleanly.
const exitFade = { type: 'exit', name: 'fade', delay: 0, duration: 400, easing: 'easeIn', enabled: true, data: {} };

const text = (props) => ({
  type: 'text',
  fontFamily: 'Plus Jakarta Sans',
  fill: '#ffffff',
  align: 'left',
  ...props,
});

const lottie = (props) => ({ type: 'lottie', ...props });

store.loadJSON({
  width: 1080,
  height: 1080,
  fonts: [],
  pages: [
    {
      id: 'post',
      background: '#1a1033',
      duration: 7000,
      children: [
        lottie({
          id: 'bags',
          src: abs(shoppingBagUrl),
          x: 470,
          y: 450,
          width: 610,
          height: 610,
          animations: [enter('zoom', 900, 700, 'easeOut', { direction: 'in' }), exitFade],
        }),
        lottie({
          id: 'discount',
          src: abs(discountUrl),
          x: 30,
          y: 640,
          width: 420,
          height: 420,
          animations: [enter('rise', 1300, 600), exitFade],
        }),
        lottie({
          id: 'sale',
          src: abs(saleUrl),
          x: 815,
          y: 30,
          width: 240,
          height: 240,
          animations: [enter('pop', 1700, 500, 'backOut'), exitFade],
        }),
        text({
          id: 'eyebrow',
          x: 80,
          y: 80,
          width: 700,
          text: 'BLACK FRIDAY',
          fontSize: 40,
          fontWeight: '700',
          letterSpacing: 0.25,
          fill: '#ffc93c',
          animations: [enter('letterPop', 0, 1000), exitFade],
        }),
        text({
          id: 'headline',
          x: 80,
          y: 140,
          width: 900,
          text: 'Up to 50% off',
          fontSize: 104,
          fontWeight: '800',
          lineHeight: 1.05,
          animations: [enter('count', 300, 1200, 'easeOut', { from: 0 }), exitFade],
        }),
        text({
          id: 'headline-2',
          x: 80,
          y: 250,
          width: 900,
          text: 'everything',
          fontSize: 104,
          fontWeight: '800',
          lineHeight: 1.05,
          fill: '#ff6fb5',
          animations: [enter('linePeek', 700, 800, 'easeOut', { direction: 'up' }), exitFade],
        }),
        text({
          id: 'subline',
          x: 80,
          y: 400,
          width: 440,
          text: 'This weekend only. Free shipping on every order.',
          fontSize: 34,
          lineHeight: 1.35,
          fill: '#cfc6ea',
          animations: [enter('wordRise', 1100, 1000), exitFade],
        }),
      ],
    },
  ],
});

// --- export ---------------------------------------------------------------

function download(url, fileName) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// One Export button. The popover picks a format and the settings that format
// supports: MP4 takes resolution and frame rate, GIF takes size and frame rate,
// PNG is a still of the last frame. Polotno primitives, inline-styled wrappers.
const FORMATS = {
  mp4: {
    label: 'MP4',
    sizes: [0.5, 1, 2],
    defaultSize: 1,
    fps: [24, 30, 60],
    defaultFps: 30,
    hint: 'Video with every animation. Plays anywhere.',
  },
  gif: {
    label: 'GIF',
    sizes: [0.25, 0.5, 1],
    defaultSize: 0.5,
    fps: [10, 15, 25],
    defaultFps: 25,
    hint: 'Loops without a player, for email and chat. Bigger sizes and frame rates make larger files.',
  },
  png: {
    label: 'PNG',
    sizes: [0.5, 1, 2],
    defaultSize: 1,
    fps: null,
    hint: 'Still image of the last frame.',
  },
};

function Choice({ value, options, onChange, format = (v) => String(v) }) {
  return (
    <ToggleGroup
      value={[String(value)]}
      onValueChange={(next) => next.length && onChange(Number(next[0]) || next[0])}
      variant="outline"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o} value={String(o)} style={{ minWidth: 48 }}>
          {format(o)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function ExportButton() {
  const [open, setOpen] = React.useState(false);
  const [format, setFormat] = React.useState('mp4');
  const [size, setSize] = React.useState(FORMATS.mp4.defaultSize);
  const [fps, setFps] = React.useState(FORMATS.mp4.defaultFps);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const cfg = FORMATS[format];

  const pickFormat = (f) => {
    setFormat(f);
    setSize(FORMATS[f].defaultSize);
    setFps(FORMATS[f].defaultFps);
  };

  const px = (r) => `${Math.round(store.width * r)}px`;
  const seconds = store.pages.reduce((t, p) => t + p.duration, 0) / 1000;

  const run = async () => {
    setBusy(true);
    setProgress(0);
    try {
      await store.waitLoading();
      if (format === 'mp4') {
        const blob = await storeToVideo({
          store,
          fps,
          pixelRatio: size,
          onProgress: (p) => setProgress(p),
        });
        const url = URL.createObjectURL(blob);
        download(url, 'lottie-post.mp4');
        URL.revokeObjectURL(url);
      } else if (format === 'gif') {
        // GIF frame delays come in 10 ms steps, so 10, 15 and 25 fps play at
        // close to their real speed; 25 (40 ms) is exact.
        await store.saveAsGIF({
          fileName: 'lottie-post.gif',
          pixelRatio: size,
          fps,
          onProgress: (p) => setProgress(p),
        });
      } else {
        await store.saveAsImage({ fileName: 'lottie-post.png', pixelRatio: size });
      }
      setOpen(false);
    } catch (e) {
      console.error(`${format} export failed`, e);
      alert('Export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <PopoverTrigger render={<Button style={{ marginLeft: 'auto' }}>Export</Button>} />
      <PopoverContent align="end" style={{ width: 300, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FieldRow label="Format">
          <Choice value={format} options={['mp4', 'gif', 'png']} onChange={pickFormat} format={(f) => FORMATS[f].label} />
        </FieldRow>
        <FieldRow label={format === 'mp4' ? 'Resolution' : 'Size'}>
          <Choice value={size} options={cfg.sizes} onChange={setSize} format={px} />
        </FieldRow>
        {cfg.fps && (
          <FieldRow label="Frame rate">
            <Choice value={fps} options={cfg.fps} onChange={setFps} format={(v) => `${v}`} />
          </FieldRow>
        )}
        <Separator />
        <div style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.7 }}>
          {cfg.hint}
          {cfg.fps ? ` ${px(size)} square, ${seconds} s at ${fps} fps.` : ` ${px(size)} square.`}
        </div>
        <Button onClick={run} disabled={busy}>
          {busy
            ? format === 'png'
              ? 'Exporting…'
              : `Exporting… ${Math.round(progress * 100)}%`
            : `Export ${cfg.label}`}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export const App = () => {
  // Fit the page once the workspace and the timeline have mounted, so the
  // canvas leads in a short iframe.
  React.useEffect(() => {
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      // Fit the whole page into the space left by the toolbar and timeline.
      const ws = document.querySelector('.polotno-workspace-container');
      const h = ws ? ws.clientHeight : 500;
      store.setScale(Math.max(0.2, Math.min(0.6, (h - 60) / store.height)));
      if (store.pages.length) store.selectPage(store.pages[0].id);
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(apply));
    store.waitLoading().then(() => requestAnimationFrame(apply));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // A 1px frame and a tinted workspace keep the demo apart from the light
    // page it is embedded in.
    <PolotnoContainer
      style={{
        width: '100vw',
        height: '100vh',
        boxSizing: 'border-box',
        border: '1px solid #d9d6e3',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <SidePanelWrap>
        <SidePanel store={store} sections={sections} defaultSection="" />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar
          store={store}
          downloadButtonEnabled={false}
          components={{ ActionControls: ExportButton }}
        />
        <Workspace store={store} backgroundColor="#e9e7f0" renderOnlyActivePage />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
