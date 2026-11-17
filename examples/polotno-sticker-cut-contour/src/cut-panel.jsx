import React from 'react';
import { observer } from 'mobx-react-lite';
import { observable, reaction, runInAction } from 'mobx';
import { Button, SliderField } from 'polotno/primitives';
import { jsonToPDFBlob } from '@polotno/pdf-export/browser';

import { cutPath } from './contour.js';
import { svgDataUrl } from './artwork.js';

// The cut line is an ordinary SVG element in a colour no artwork uses. At
// export, `spotColors` maps that colour to a spot ink named CutContour, so the
// line reaches the PDF as its own separation, apart from the printed artwork.
const CUT_NAME = 'cut-contour';
const CUT_COLOR = '#ec008c';
const CUT_INK = { name: 'CutContour', cmyk: [0, 1, 0, 0], overprint: true };
const GRID = 600; // cells across the longest side when tracing

const state = observable({ offsetMm: 3, tracing: false, exporting: false, message: '' });

const mmToPx = (store, v) => (v / 25.4) * store.dpi;
const cutElement = (store) => store.activePage?.children.find((el) => el.name === CUT_NAME);
const loadImageData = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = reject;
    img.src = src;
  });

// One trace at a time: an edit during a trace queues a single rerun.
let again = false;

async function retrace(store) {
  const page = store.activePage;
  if (!page) return;
  if (state.tracing) return void (again = true);
  runInAction(() => (state.tracing = true));
  const cut = cutElement(store);
  try {
    // The line must not trace itself: hide it while the artwork is rendered.
    if (cut) await store.history.ignore(() => cut.set({ visible: false }));
    await store.waitLoading();
    const pixelRatio = Math.min(1, GRID / Math.max(store.width, store.height));
    const src = await store.toDataURL({ pageId: page.id, pixelRatio, ignoreBackground: true });
    const image = await loadImageData(src);
    const scale = image.width / store.width; // cells per page px
    const d = cutPath(image, mmToPx(store, state.offsetMm) * scale);
    await store.history.ignore(() => {
      if (!d) {
        if (cut) store.deleteElements([cut.id]);
        return;
      }
      const stroke = Math.max(1, mmToPx(store, 0.25) * scale);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${image.width} ${image.height}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${CUT_COLOR}" stroke-width="${stroke.toFixed(2)}"/></svg>`;
      const attrs = { src: svgDataUrl(svg), x: 0, y: 0, width: store.width, height: store.height, visible: true };
      if (cut) cut.set(attrs);
      else
        page.addElement({
          type: 'svg',
          name: CUT_NAME,
          ...attrs,
          selectable: false,
          draggable: false,
          resizable: false,
          removable: false,
          contentEditable: false,
          styleEditable: false,
          alwaysOnTop: true,
        }, { skipSelect: true });
    });
  } catch (e) {
    console.error('Tracing the cut line failed', e);
    if (cut) await store.history.ignore(() => cut.set({ visible: true }));
  } finally {
    runInAction(() => (state.tracing = false));
    if (again) {
      again = false;
      retrace(store);
    }
  }
}

/** Keep the cut line in step with the artwork: retrace after each edit settles. */
export function startCutLine(store) {
  let last = '';
  let timer = null;
  const signature = () =>
    JSON.stringify([
      state.offsetMm,
      store.width,
      store.height,
      (store.activePage?.children || []).filter((el) => el.name !== CUT_NAME).map((el) => el.toJSON()),
    ]);
  const schedule = () => {
    const next = signature();
    if (next === last) return; // only the cut line changed
    last = next;
    clearTimeout(timer);
    timer = setTimeout(() => retrace(store), 350);
  };
  store.on('change', schedule);
  reaction(() => state.offsetMm, schedule);
  schedule();
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const panel = {
  width: 280,
  flexShrink: 0,
  borderLeft: '1px solid var(--border, #e0e0e0)',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  overflowY: 'auto',
  fontSize: 14,
};
const muted = { color: 'var(--muted-foreground, #6f6f6f)', fontSize: 13, lineHeight: 1.45, margin: 0 };

export const CutPanel = observer(({ store }) => {
  const onExport = async () => {
    runInAction(() => {
      state.exporting = true;
      state.message = '';
    });
    try {
      const blob = await jsonToPDFBlob(store.toJSON(), { spotColors: { [CUT_COLOR]: CUT_INK } });
      download(blob, 'sticker-cutcontour.pdf');
      runInAction(() => (state.message = 'Downloaded. In Acrobat, Output Preview shows the CutContour plate.'));
    } catch (e) {
      console.error('PDF export failed', e);
      runInAction(() => (state.message = `Export failed: ${e.message}`));
    } finally {
      runInAction(() => (state.exporting = false));
    }
  };
  return (
    <div style={panel}>
      <div style={{ fontWeight: 600, fontSize: 16 }}>Cut line</div>
      <p style={muted}>
        The magenta line is traced around the artwork and follows every edit. Upload a transparent PNG to try your own
        sticker.
      </p>
      <SliderField
        label="Offset from artwork (mm)"
        value={state.offsetMm}
        min={1}
        max={8}
        step={0.5}
        onChange={(v) => runInAction(() => (state.offsetMm = v))}
      />
      <p style={muted}>{state.tracing ? 'Tracing…' : cutElement(store) ? 'Cut line ready.' : 'Add artwork to get a cut line.'}</p>
      <Button onClick={onExport} disabled={state.exporting || state.tracing || !cutElement(store)}>
        {state.exporting ? 'Exporting…' : 'Export PDF'}
      </Button>
      <p style={muted}>The PDF writes the line as a CutContour spot ink. Check the ink name your cutter expects.</p>
      {state.message && <p style={muted}>{state.message}</p>}
    </div>
  );
});
