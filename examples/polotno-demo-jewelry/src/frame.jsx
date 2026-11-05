import React from 'react';
import { observer } from 'mobx-react-lite';
import { PX, paddingOf } from './parts.js';
import { CANVAS, theme } from './theme.js';
import { DOT_INK } from './grid.js';

// The work area is one fixed frame, like a viewport in desktop jewelry CAD.
// The rulers sit on its top and left edges and never move. Zoom and scroll
// change what's inside the frame, and the rulers re-count the millimetres
// they show. The selection is marked on both rulers with its size.
//
// The workspace and the page are both black with no border, so the page
// edge doesn't show: the frame reads as one endless sheet. The page (40 x
// 30 mm) is still what gets exported and rendered.

const T = 30; // ruler thickness, px
// Colours come from the theme (theme.css), so the rulers match the toolbar
// in both palettes. Numbers are muted: the rulers are a reference, not the
// subject.
const BG = 'var(--jw-ruler)';
const INK = 'var(--jw-ruler-ink)';
const TICK = 'var(--jw-ruler-tick)';
const LINE = 'var(--pn-border)';
const MARK = 'var(--jw-mark)';
const MARK_INK = 'var(--jw-mark-ink)';
// Numbers sit near the outer edge, ticks hang from the inner edge, with a
// clear gap between them.
const TICK_MAJOR = 8;
const TICK_MID = 5;
const TICK_MINOR = 3;
const NUM = 11; // number size, px
const NUM_AT = 12; // number centre, px from the outer edge

// Label spacing in mm: the smallest step that leaves room for the numbers.
const STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
const labelStep = (pxPerMm) => STEPS.find((s) => s * pxPerMm >= 44) || 50;
const minorOf = (step) => {
  const lead = Math.round(step / Math.pow(10, Math.floor(Math.log10(step) + 1e-9)));
  return step / (lead === 2 ? 4 : 5);
};
const fmt = (v, step) => (step < 1 ? v.toFixed(1) : String(Math.round(v)));

// Screen geometry of the frame and of the page's origin, read from the DOM
// every frame (zoom, scroll and resize all move it).
function useGeometry(store) {
  const [g, setG] = React.useState(null);
  React.useEffect(() => {
    let raf;
    let last = '';
    const tick = () => {
      const ws = document.querySelector('.polotno-workspace-container');
      const pc = document.querySelector('.polotno-page-container.active-page');
      if (ws && pc) {
        const w = ws.getBoundingClientRect();
        const p = pc.getBoundingClientRect();
        // The page sits centred in its container, inside Polotno's padding.
        const pageW = store.width * store.scale;
        const pageH = store.height * store.scale;
        const next = {
          left: w.left,
          top: w.top,
          width: w.width,
          height: w.height,
          x0: p.left + (p.width - pageW) / 2,
          y0: p.top + (p.height - pageH) / 2,
          pxPerMm: PX * store.scale,
        };
        const key = Object.values(next).map((v) => v.toFixed(2)).join(',');
        if (key !== last) {
          last = key;
          setG(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [store]);
  return g;
}

function selectionMm(store) {
  const els = store.selectedElements;
  if (!els.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of els) {
    const a = (e.rotation * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const p = paddingOf(e);
    for (const [dx, dy] of [[p.x, p.y], [e.width - p.x, p.y], [e.width - p.x, e.height - p.y], [p.x, e.height - p.y]]) {
      const x = e.x + dx * cos - dy * sin;
      const y = e.y + dx * sin + dy * cos;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return { x0: x0 / PX, y0: y0 / PX, x1: x1 / PX, y1: y1 / PX };
}

const sizeLabel = (mm) => `${Math.round(mm * 10) / 10} mm`;

// One ruler. `origin` is where 0 mm falls along the ruler, in px from its
// start, and `length` is the ruler's length in px.
function Ruler({ length, origin, pxPerMm, vertical, mark }) {
  const step = labelStep(pxPerMm);
  const minor = minorOf(step);
  const from = Math.floor(-origin / pxPerMm / minor) * minor;
  const to = (length - origin) / pxPerMm;
  const at = (mm) => origin + mm * pxPerMm;
  let markPx = null;
  if (mark) {
    const a = Math.max(0, at(mark[0]));
    const b = Math.min(length, at(mark[1]));
    if (b > a) markPx = [a, b, mark[1] - mark[0]];
  }
  const items = [];
  for (let i = 0; i < 4000; i++) {
    const mm = from + i * minor;
    if (mm > to) break;
    const p = at(mm);
    if (p < 0) continue;
    const isMajor = Math.abs(mm / step - Math.round(mm / step)) < 1e-6;
    const isMid = !isMajor && Math.abs((mm * 2) / step - Math.round((mm * 2) / step)) < 1e-6;
    const size = isMajor ? TICK_MAJOR : isMid ? TICK_MID : TICK_MINOR;
    items.push(
      vertical ? (
        <line key={i} x1={T} x2={T - size} y1={p} y2={p} style={{ stroke: TICK }} strokeWidth={1} />
      ) : (
        <line key={i} x1={p} x2={p} y1={T} y2={T - size} style={{ stroke: TICK }} strokeWidth={1} />
      ),
    );
    // Numbers under the selection give way to its size label.
    const covered = markPx && p >= markPx[0] - 18 && p <= markPx[1] + 18;
    if (isMajor && !covered && p > 12 && p < length - 12) {
      const text = fmt(Math.abs(mm) < 1e-9 ? 0 : mm, step);
      items.push(
        vertical ? (
          <text key={`t${i}`} x={NUM_AT} y={p} fontSize={NUM} style={{ fill: INK }} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${NUM_AT} ${p})`}>
            {text}
          </text>
        ) : (
          <text key={`t${i}`} x={p} y={NUM_AT} fontSize={NUM} style={{ fill: INK }} textAnchor="middle" dominantBaseline="central">
            {text}
          </text>
        ),
      );
    }
  }
  let markEl = null;
  if (markPx) {
    const [a, b, mm] = markPx;
    const mid = (a + b) / 2;
    markEl = vertical ? (
      <g>
        <rect x={0} y={a} width={T} height={b - a} style={{ fill: MARK }} />
        <text x={NUM_AT} y={mid} fontSize={NUM} fontWeight={600} style={{ fill: MARK_INK }} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${NUM_AT} ${mid})`}>
          {sizeLabel(mm)}
        </text>
      </g>
    ) : (
      <g>
        <rect x={a} y={0} width={b - a} height={T} style={{ fill: MARK }} />
        <text x={mid} y={NUM_AT} fontSize={NUM} fontWeight={600} style={{ fill: MARK_INK }} textAnchor="middle" dominantBaseline="central">
          {sizeLabel(mm)}
        </text>
      </g>
    );
  }
  return (
    <svg
      width={vertical ? T : length}
      height={vertical ? length : T}
      style={{ display: 'block', background: BG, fontFamily: 'var(--jw-text)', fontVariantNumeric: 'tabular-nums' }}
    >
      {markEl}
      {items}
    </svg>
  );
}

// The dot grid beyond the sheet. Inside the sheet, the grid is a layer on
// the page (grid.js); outside it, the same lattice is painted on the
// workspace behind Polotno's (transparent) canvas: dots on whole mm, measured
// from the sheet's 0 mm corner and scaled with the zoom, so the two read as
// one grid across the whole work area.
function useWorkspaceDots(g, themeName) {
  React.useEffect(() => {
    const ws = document.querySelector('.polotno-workspace-container');
    if (!ws || !g) return;
    const ink = DOT_INK[themeName] || DOT_INK.dark;
    const p = g.pxPerMm;
    const r = Math.max(0.5, 0.04 * p);
    const R = Math.max(0.6, 0.055 * p);
    // Tiles are centred on the dots: offset by half a tile from the 0 mm line.
    const ox = g.x0 - g.left;
    const oy = g.y0 - g.top;
    const dot = (rad) => `radial-gradient(circle at center, rgba(${ink},0.1) ${rad}px, transparent ${rad + 0.6}px)`;
    ws.style.backgroundColor = CANVAS[themeName];
    ws.style.backgroundImage = `${dot(R)}, ${dot(r)}`;
    ws.style.backgroundSize = `${5 * p}px ${5 * p}px, ${p}px ${p}px`;
    ws.style.backgroundPosition = `${ox - 2.5 * p}px ${oy - 2.5 * p}px, ${ox - p / 2}px ${oy - p / 2}px`;
  }, [g, themeName]);
}

export const FrameRulers = observer(({ store }) => {
  const g = useGeometry(store);
  useWorkspaceDots(g, theme.name);
  if (!g) return null;
  const sel = selectionMm(store);
  const box = { position: 'fixed', zIndex: 5, pointerEvents: 'none' };
  return (
    <>
      <div style={{ ...box, left: g.left + T, top: g.top, borderBottom: `1px solid ${LINE}` }}>
        <Ruler length={g.width - T} origin={g.x0 - g.left - T} pxPerMm={g.pxPerMm} mark={sel && [sel.x0, sel.x1]} />
      </div>
      <div style={{ ...box, left: g.left, top: g.top + T, borderRight: `1px solid ${LINE}` }}>
        <Ruler length={g.height - T} origin={g.y0 - g.top - T} pxPerMm={g.pxPerMm} vertical mark={sel && [sel.y0, sel.y1]} />
      </div>
      <div
        style={{
          ...box,
          left: g.left,
          top: g.top,
          width: T,
          height: T,
          background: BG,
          color: INK,
          fontSize: 12,
          fontStyle: 'italic',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--jw-display)',
          borderRight: `1px solid ${LINE}`,
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        mm
      </div>
    </>
  );
});
