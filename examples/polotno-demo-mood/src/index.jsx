import React from 'react';
import ReactDOM from 'react-dom/client';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import 'polotno/ui.css';
import './styles.css';
import { ROOMS, roomById, asset, coloursFor, SOFT_SHADOW } from './scene';
import { tint } from './tint';

const store = createStore({ key: 'HyhTCjrrUThWw9E7dO_y', showCredit: false });
window.store = store;

// Admin mode (?admin=1, dev server only): pieces can be dragged and resized,
// Save layout writes every style's box to src/layout.json, and "Fix part of
// this…" opens repaint mode (see repaint-server.js) to fix a bad region of a
// piece. Both write files through the dev server, so they're off elsewhere.
const ADMIN = import.meta.env.DEV && new URLSearchParams(window.location.search).has('admin');
const edits = {};

// Room light: the same room and pieces relit from one render of the empty
// room per light (pipeline/relight.mjs), with the view out of the window put
// in (pipeline/window-view.mjs), stored as <file>-<light>.webp.
// `cast` is each light's colour over the whole room (relight.mjs prints it);
// recoloured fabric takes it, or a cream sofa stays daylight-white under a
// warm lamp.
const LIGHTS = [
  { id: 'cloudy', label: 'Cloudy', cast: [0.951, 1.005, 1.17] },
  { id: 'sun', label: 'Sun', cast: [1.038, 0.99, 0.905] },
  { id: 'night', label: 'Night', cast: [1.161, 0.937, 0.736] },
];
let light = 'cloudy';
const withLight = (src, id) => src.replace(/\.webp(\?|$)/, `-${id}.webp$1`);
const lit = (src) => withLight(src, light);

// --- scene ---------------------------------------------------------------
// One page per room, the size of its photo, with the empty room as background
// and one image per slot on top. A room starts empty: each slot shows a +
// marker (plain HTML over the canvas) until a piece is picked for it. Pieces
// swap, recolour and resize in place; they don't move, since a photo only fits
// the spot it was taken for. Background slots (curtains) swap the room photo
// itself instead of a piece.

store.setSize(ROOMS[0].width, ROOMS[0].height);

// Pieces flat on the wall or floor first, then one layer holding every
// piece's shadow, then the rest, so shadows land on the rug or the floor but
// never on another piece.
for (const room of ROOMS) {
  const page = store.addPage({ background: asset(lit(room.src)), width: room.width, height: room.height, custom: { room: room.id } });
  let shadows = false;
  for (const slot of room.slots) {
    if (!slot.beforeShadows && !shadows) {
      shadows = true;
      page.addElement({
        type: 'image',
        name: 'shadows',
        src: asset(room.src),
        x: 0,
        y: 0,
        width: room.width,
        height: room.height,
        visible: false,
        selectable: false,
        draggable: false,
        removable: false,
      });
    }
    const first = slot.items[0];
    page.addElement({
      type: 'image',
      name: slot.id,
      src: asset(first.src),
      ...(first.box || { x: 0, y: 0, width: 10, height: 10 }),
      visible: false,
      selectable: !slot.background,
      draggable: ADMIN,
      removable: false,
      ...(slot.shadow ? SOFT_SHADOW : {}),
      custom: { item: first.id, colour: null, shadow: slot.shadow, on: false },
    });
  }
}
store.selectPage(store.pages[0].id);
store.history.clear();

// Keep shadows under pieces that are moved or resized, and remember the new
// box for that style.
reaction(
  () => store.activePage.children.filter((el) => el.visible && el.custom?.item).map((el) => [el.custom.item, el.x, el.y, el.width, el.height].join()),
  () => {
    for (const el of store.activePage.children) {
      if (!el.visible || !el.custom?.item || el.name === 'shadows') continue;
      const item = slotById(el.name)?.items.find((i) => i.id === el.custom.item);
      if (!item) continue;
      let b = { x: Math.round(el.x), y: Math.round(el.y), width: Math.round(el.width), height: Math.round(el.height) };
      // A material has its own cut-out box: store where the style itself stands.
      const v = variantOf(item, el.custom.material);
      if (v !== item) b = growBox(b, { from: v.baseBox, to: item.baseBox });
      const o = edits[item.id] || item.box;
      if (b.x !== o.x || b.y !== o.y || b.width !== o.width || b.height !== o.height) edits[item.id] = b;
    }
    clearTimeout(window.__mergeTimer);
    window.__mergeTimer = setTimeout(mergeShadows, 150);
  },
);

async function saveLayout(e) {
  const button = e.currentTarget;
  const res = await fetch('/__layout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edits) });
  button.textContent = res.ok ? `Saved ${Object.keys(edits).length}` : 'Save failed';
  setTimeout(() => (button.textContent = 'Save layout'), 2500);
}

const pageFor = (roomId) => store.pages.find((p) => p.custom?.room === roomId);
const activeRoom = () => roomById(store.activePage.custom.room);
const slotById = (id) => activeRoom().slots.find((s) => s.id === id);
const elementFor = (slotId) => store.activePage.children.find((el) => el.name === slotId);
// A background slot's element stays hidden; `custom.on` says it is in use.
const isFilled = (el) => el.visible || Boolean(el.custom.on);
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
const shadowImages = new Map();
const shadowImage = (src) => {
  if (!shadowImages.has(src)) shadowImages.set(src, loadImage(src));
  return shadowImages.get(src);
};

// Where two shadows overlap, the darker one wins instead of the two stacking:
// a patch of floor out of the sun can only lose that sun once. All baked
// shadows are merged into one layer, keeping the strongest alpha per pixel.
// A shadow moves and scales with its piece: map it from where the piece was
// cut (base) to where the piece is now.
function followPiece(shadow, base, el) {
  const sx = el.width / base.width, sy = el.height / base.height;
  return {
    x: Math.round(el.x + (shadow.x - base.x) * sx),
    y: Math.round(el.y + (shadow.y - base.y) * sy),
    width: Math.round(shadow.width * sx),
    height: Math.round(shadow.height * sy),
  };
}

let merging = 0;
async function mergeShadows() {
  const run = ++merging;
  const room = activeRoom();
  const parts = room.slots.map((slot) => {
    const el = elementFor(slot.id);
    const item = itemOf(slot, el);
    if (!(el.visible && el.custom.shadow && item.shadow)) return null;
    const v = variantOf(item, el.custom.material);
    return { src: item.shadow.src, box: followPiece(item.shadow.box, v.baseBox || item.baseBox || item.box, el) };
  }).filter(Boolean);
  const layer = elementFor('shadows');
  if (!parts.length) return layer.set({ visible: false });
  const images = await Promise.all(parts.map((p) => shadowImage(asset(p.src))));
  if (run !== merging) return;
  const canvas = document.createElement('canvas');
  canvas.width = room.width;
  canvas.height = room.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const alpha = new Uint8ClampedArray(room.width * room.height);
  parts.forEach((p, i) => {
    ctx.clearRect(0, 0, room.width, room.height);
    ctx.drawImage(images[i], p.box.x, p.box.y, p.box.width, p.box.height);
    const d = ctx.getImageData(p.box.x, p.box.y, p.box.width, p.box.height).data;
    for (let y = 0; y < p.box.height; y++) {
      const row = (p.box.y + y) * room.width + p.box.x;
      for (let x = 0; x < p.box.width; x++) {
        if (p.box.x + x < 0 || p.box.x + x >= room.width || p.box.y + y < 0 || p.box.y + y >= room.height) continue;
        const a = d[(y * p.box.width + x) * 4 + 3];
        if (a > alpha[row + x]) alpha[row + x] = a;
      }
    }
  });
  const out = ctx.createImageData(room.width, room.height);
  for (let i = 0; i < alpha.length; i++) out.data[i * 4 + 3] = alpha[i];
  ctx.putImageData(out, 0, 0);
  layer.set({ src: canvas.toDataURL('image/webp', 0.9), visible: true });
}

// A piece with a baked shadow joins the merged layer; others fall back to the
// soft drop shadow. `on` is the sidebar's shadow switch.
function setShadow(slotId, item, on) {
  const slot = slotById(slotId);
  const el = elementFor(slotId);
  el.set({
    custom: { ...el.custom, shadow: on },
    ...(on && slot.shadow && !item.shadow ? SOFT_SHADOW : { shadowEnabled: false }),
  });
  return mergeShadows();
}
const shadowOn = (slotId) => Boolean(elementFor(slotId).custom.shadow);
const itemOf = (slot, el) => slot.items.find((i) => i.id === el.custom.item);
// A style in one of its materials: its own picture, colour mask and cut-out box.
const variantOf = (item, material) => (material && item.materials?.find((m) => m.id === material)) || item;

async function show(slotId, itemId, colour, material = null) {
  const slot = slotById(slotId);
  const item = slot.items.find((i) => i.id === itemId);
  const v = variantOf(item, material);
  if (slot.background) {
    store.activePage.set({ background: asset(lit(v.room)) });
    elementFor(slotId).set({ custom: { item: item.id, material, colour: null, shadow: false, on: true } });
    prefetchLights();
    return;
  }
  // A colour only sticks to pieces that have a colour mask.
  const keep = v.colour ? colour : null;
  const src = keep ? await tint(asset(lit(v.src)), asset(v.colour), keep.rgb, asset(v.src), LIGHTS.find((l) => l.id === light).cast) : asset(lit(v.src));
  const el = elementFor(slotId);
  // A new style starts at its own size; a new colour keeps any resizing; a new
  // material keeps the style's placement, mapped onto its own cut-out.
  const same = el.custom.item === item.id && (el.custom.material || null) === material;
  const place = edits[item.id] || item.box;
  const box = same ? {} : v === item ? place : growBox(place, { from: item.baseBox, to: v.baseBox });
  const wasOn = el.visible ? shadowOn(slotId) : slot.shadow;
  el.set({ src, ...box, visible: true, custom: { item: item.id, material, colour: keep, shadow: wasOn } });
  await setShadow(slotId, item, wasOn);
  prefetchLights();
}

// Swapping a piece shouldn't snap. Freeze the current picture over the
// canvas, make the change underneath, wait for its images, then fade the
// frozen picture away, so the old piece dissolves into the new one (shadows
// and room swaps included).
async function crossfade(change) {
  const stage = document.querySelector('.rd-stage');
  const canvases = [...document.querySelectorAll('.polotno-page-container canvas')];
  if (!stage || !canvases.length) return change();
  const first = canvases[0];
  const snap = document.createElement('canvas');
  snap.width = first.width;
  snap.height = first.height;
  const ctx = snap.getContext('2d');
  for (const c of canvases) ctx.drawImage(c, 0, 0, snap.width, snap.height);
  const r = first.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  snap.className = 'rd-fade';
  Object.assign(snap.style, {
    left: `${r.left - s.left}px`,
    top: `${r.top - s.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });
  stage.insertBefore(snap, stage.children[1] || null);
  try {
    await change();
    await store.waitLoading();
  } finally {
    // Two frames so the canvas has painted the new state under the snapshot;
    // a background tab gets no frames, so don't wait on them for long.
    await Promise.race([
      new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      new Promise((done) => setTimeout(done, 150)),
    ]);
    snap.style.opacity = '0';
    setTimeout(() => snap.remove(), 600);
  }
}

// After a repaint the files on disk changed: point the piece at fresh copies
// and redraw it if it's in the room. A repaint that reached past the piece's
// box grew it (`grow`): every box of that style grows the same way.
const growBox = (b, { from, to }) => {
  const s = b.width / from.width;
  return {
    x: Math.round(b.x + (to.x - from.x) * s),
    y: Math.round(b.y + (to.y - from.y) * s),
    width: Math.round(to.width * s),
    height: Math.round(to.height * s),
  };
};
async function reload(itemId, grow) {
  const fresh = (src) => `${src.replace(/\?.*$/, '')}?r=${Date.now()}`;
  for (const slot of activeRoom().slots) {
    const item = slot.items.find((i) => i.id === itemId);
    if (!item) continue;
    const el = elementFor(slot.id);
    const base = (src) => (src || '').replace(/\?.*$/, '');
    const onScreen = isFilled(el) && base(slot.background ? store.activePage.background : el.src) === base(asset(slot.background ? item.room : item.src));
    item.src = fresh(item.src);
    if (item.room) item.room = fresh(item.room);
    if (item.shadow) item.shadow = { ...item.shadow, src: fresh(item.shadow.src) };
    if (grow) {
      item.baseBox = grow.to;
      item.box = growBox(item.box, grow);
      if (edits[itemId]) edits[itemId] = growBox(edits[itemId], grow);
      if (onScreen) el.set(growBox({ x: el.x, y: el.y, width: el.width, height: el.height }, grow));
    }
    if (onScreen) await show(slot.id, itemId, el.custom.colour, el.custom.material || null);
  }
}

// Relight the room and everything in it. Only the pictures change with the
// light (shadows stay), so load every new picture first, then swap them all
// in one go.
async function setLight(id) {
  light = id;
  const room = activeRoom();
  const unit = room.slots.find((s) => s.background && isFilled(elementFor(s.id)));
  const unitEl = unit && elementFor(unit.id);
  const swaps = [[null, asset(lit(unit ? variantOf(itemOf(unit, unitEl), unitEl.custom.material).room : room.src))]];
  for (const slot of room.slots) {
    const el = elementFor(slot.id);
    if (slot.background || !el.visible) continue;
    const item = itemOf(slot, el);
    // Recoloured pieces are re-tinted from the relit picture.
    if (el.custom.colour) await show(slot.id, item.id, el.custom.colour, el.custom.material || null);
    else swaps.push([el, asset(lit(variantOf(item, el.custom.material).src))]);
  }
  await Promise.all(swaps.map(([, src]) => loadImage(src).catch(() => null)));
  for (const [el, src] of swaps) (el ? el.set({ src }) : store.activePage.set({ background: src }));
  prefetchLights();
}

// Fetch the other lights' pictures of what's in the room in the background,
// so switching is quick.
const fetched = new Set();
function prefetchLights() {
  clearTimeout(prefetchLights.timer);
  prefetchLights.timer = setTimeout(() => {
    const room = activeRoom();
    const files = [room.src];
    for (const slot of room.slots) {
      const el = elementFor(slot.id);
      if (!isFilled(el)) continue;
      const v = variantOf(itemOf(slot, el), el.custom.material);
      files.push(slot.background ? v.room : v.src);
    }
    for (const l of LIGHTS) for (const f of files) {
      const src = asset(withLight(f, l.id));
      if (!fetched.has(src)) {
        fetched.add(src);
        loadImage(src).catch(() => fetched.delete(src));
      }
    }
  }, 800);
}

// Admin mode: drive the editor from the console (and from tests).
if (ADMIN) window.__rd = { show: (...a) => show(...a), setLight: (id) => setLight(id) };

async function remove(slotId) {
  if (slotById(slotId).background) {
    store.activePage.set({ background: asset(lit(activeRoom().src)) });
    elementFor(slotId).set({ custom: { ...elementFor(slotId).custom, on: false } });
    return;
  }
  elementFor(slotId).set({ visible: false });
  await mergeShadows();
  store.selectElements([]);
}

// --- UI ------------------------------------------------------------------

const Icon = ({ d, size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICONS = {
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'm15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  cloudy: 'M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 11.1 3.5 3.5 0 0 0 7 18Z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  night: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',
  plus: 'M12 6v12M6 12h12',
  upload: 'M12 16V5m0 0-4 4m4-4 4 4M5 19h14',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5',
};

const CONTACT = `mailto:team@polotno.com?subject=${encodeURIComponent('Re: Room visualizer demo')}`;

// What the locked AI features would do, shown when someone tries one.
const AI_FEATURES = {
  generate: {
    title: 'Generate a piece with AI',
    text: 'In a full build, you describe a piece, like a green velvet sofa with brass legs, and AI paints it into this spot in the room’s own light and angle.',
  },
  upload: {
    title: 'Upload your own piece, placed by AI',
    text: 'In a full build, you upload a product photo and AI fits it into this spot, matching the room’s angle and light.',
  },
};

// --- sidebar ---------------------------------------------------------------

// Room cards, in the sidebar on desktop. Phones have the one room for now.
const Rooms = ({ room, onChange, blurbs = false }) => (
  <div className={blurbs ? 'rd-rooms with-blurbs' : 'rd-rooms'}>
    {ROOMS.map((r) => (
      <button key={r.id} className={r.id === room ? 'rd-room on' : 'rd-room'} onClick={() => onChange(r.id)}>
        <img src={asset(r.thumb)} alt="" />
        <span className="rd-room-name">{r.label}</span>
      </button>
    ))}
  </div>
);

const SlotEditor = observer(({ slotId, onAi, onFix }) => {
  const slot = slotById(slotId);
  const el = elementFor(slotId);
  const filled = isFilled(el);
  const current = filled ? itemOf(slot, el) : null;
  const colour = el.custom.colour;
  const material = el.custom.material || null;
  const variant = current ? variantOf(current, material) : null;
  const [busy, setBusy] = React.useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rd-editor">
      <div className="rd-row">
        <span className="rd-label">{filled ? 'Style' : 'Pick a style to add it'}</span>
        <div className="rd-scroll">
          <div className="rd-styles">
          {slot.items.map((item) => (
            <button
              key={item.id}
              className={item.id === current?.id ? 'rd-style on' : 'rd-style'}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await crossfade(() => show(slotId, item.id, colour));
                  if (!slot.background) store.selectElements([el.id]);
                })
              }
            >
              <img src={asset(item.src)} alt="" />
              {/-s[23]$/.test(item.id) && <span className="rd-badge">{item.id.endsWith('-s2') ? 'AI zone' : 'Drawn'}</span>}
            </button>
          ))}
          </div>
        </div>
      </div>

      {current?.materials?.length > 0 && (
        <div className="rd-row">
          <span className="rd-label">Material</span>
          <div className="rd-slots">
            {[{ id: null, label: 'Original' }, ...current.materials].map((m) => (
              <button
                key={m.id || 'original'}
                className={m.id === material ? 'rd-slot on' : 'rd-slot'}
                disabled={busy}
                onClick={() => run(() => crossfade(() => show(slotId, current.id, colour, m.id)))}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {variant?.colour && (
        <div className="rd-row">
          <span className="rd-label">Colour</span>
          <div className="rd-swatches">
            <button
              className={!colour ? 'rd-swatch rd-original on' : 'rd-swatch rd-original'}
              title="Original"
              disabled={busy}
              onClick={() => run(() => crossfade(() => show(slotId, current.id, null, material)))}
            />
            {coloursFor(slotId).map((c) => (
              <button
                key={c.name}
                className={colour?.name === c.name ? 'rd-swatch on' : 'rd-swatch'}
                style={{ background: `rgb(${c.rgb.join(',')})` }}
                title={c.name}
                disabled={busy}
                onClick={() => run(() => crossfade(() => show(slotId, current.id, c, material)))}
              />
            ))}
          </div>
        </div>
      )}

      {ADMIN && filled && (
        <button className="rd-remove" onClick={() => onFix(slotId)}>
          Fix part of this {slot.label.toLowerCase()}…
        </button>
      )}

      {filled && (
        <button className="rd-remove" onClick={() => crossfade(() => remove(slotId))}>
          Remove {slot.label.toLowerCase()}
        </button>
      )}
    </div>
  );
});

const Furniture = observer(({ slotId, onPick, onAi, onFix }) => (
  <>
    <div className="rd-slots">
      {[...activeRoom().slots].reverse().map((slot) => (
        <button
          key={slot.id}
          className={slot.id === slotId ? 'rd-slot on' : 'rd-slot'}
          onClick={() => onPick(slot.id)}
        >
          {isFilled(elementFor(slot.id)) && <span className="rd-dot" />}
          {slot.label}
        </button>
      ))}
    </div>
    {slotId ? (
      // keyed by slot, so the style row starts scrolled to the left again
      <SlotEditor key={slotId} slotId={slotId} onAi={onAi} onFix={onFix} />
    ) : (
      <p className="rd-hint">Pick a piece above, or tap a + in the room.</p>
    )}
  </>
));

// --- over the room -------------------------------------------------------

// Where the page sits inside the stage. Polotno centres the page in its
// container at `store.scale`, so a room point maps to the screen from the
// container's box.
function usePageBox() {
  const [box, setBox] = React.useState(null);
  React.useEffect(() => {
    let frame;
    const measure = () => {
      const page = document.querySelector('.polotno-page-container');
      const stage = document.querySelector('.rd-stage');
      if (page && stage) {
        const r = page.getBoundingClientRect();
        const s = stage.getBoundingClientRect();
        const next = { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height };
        setBox((b) =>
          b && b.left === next.left && b.top === next.top && b.width === next.width && b.height === next.height
            ? b
            : next,
        );
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!box) return null;
  const s = store.scale;
  // Rooms differ in size, so use the active page's own size.
  const pw = store.activePage.computedWidth;
  const ph = store.activePage.computedHeight;
  return {
    x: box.left + (box.width - pw * s) / 2,
    y: box.top + (box.height - ph * s) / 2,
    s,
  };
}

// Markers for empty slots, as in the client's design: a thin white ring with
// a faint gradient inside, the same size everywhere. Floor pieces get theirs where
// the piece meets the floor. Tapping opens a small label.
const WALL = ['wall-carpet', 'wall-unit'];
// Spots moved off the first style's footprint, in room pixels: the sofa's
// sits nearer the wall and the middle of the room, clear of the others.
const MARK = { sofa: { x: 900, y: 1830 } };
// Where a floor piece's marker goes: under its first style, where it meets
// the floor. A rug lies flat: on its front left, clear of the table and the
// armchair that stand on it.
const footprint = (slot) => {
  const b = slot.items[0]?.baseBox;
  if (MARK[slot.id]) return MARK[slot.id];
  if (!b) return slot.spot;
  if (slot.id === 'rug') return { x: b.x + b.width * 0.3, y: b.y + b.height * 0.8 };
  return { x: b.x + b.width / 2, y: b.y + b.height * 0.96 };
};
const Markers = observer(({ active, onPick }) => {
  const at = usePageBox();
  if (!at) return null;
  return activeRoom().slots.filter((slot) => !isFilled(elementFor(slot.id))).map((slot) => {
    const p = WALL.includes(slot.id) ? slot.spot : footprint(slot);
    // Near the photo's sides the label opens inward, so it isn't cut off.
    const side = p.x < store.activePage.computedWidth * 0.2 ? 'from-left' : p.x > store.activePage.computedWidth * 0.8 ? 'from-right' : '';
    return (
      <button
        key={slot.id}
        className={['rd-spot', side, slot.id === active ? 'on' : ''].join(' ')}
        style={{ left: at.x + p.x * at.s, top: at.y + p.y * at.s }}
        onClick={() => onPick(slot.id)}
        aria-label={`Add ${slot.label.toLowerCase()}`}
      >
        <span className="rd-spot-label">Add {slot.label.toLowerCase()}</span>
      </button>
    );
  });
});

// Pinch zoom stays inside the photo's frame and never goes below the whole
// room in view: the scale that fits the page into the stage, less padding.
function useZoomFloor(pad) {
  React.useEffect(() => {
    const stage = document.querySelector('.rd-stage');
    let fit = 0;
    const measure = () => {
      const r = stage.getBoundingClientRect();
      const page = store.activePage;
      if (!page) return;
      fit = Math.min((r.width - pad.x * 2) / page.computedWidth, (r.height - pad.y * 2) / page.computedHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    const stop = reaction(
      () => store.scale,
      (scale) => fit && scale < fit * 0.999 && store.setScale(fit),
    );
    return () => {
      observer.disconnect();
      stop();
    };
  }, [pad.x, pad.y]);
}

const Actions = observer(({ onDownload }) => (
  <div className="rd-actions">
    {ADMIN && (
      <button className="rd-zoom" onClick={saveLayout}>
        Save layout
      </button>
    )}
    <button className="rd-icon" disabled={!store.history.canUndo} onClick={() => store.history.undo()} aria-label="Undo">
      <Icon d={ICONS.undo} />
    </button>
    <button className="rd-icon" disabled={!store.history.canRedo} onClick={() => store.history.redo()} aria-label="Redo">
      <Icon d={ICONS.redo} />
    </button>
    <button className="rd-icon" onClick={onDownload} aria-label="Download">
      <Icon d={ICONS.download} />
    </button>
  </div>
));

const AiOff = ({ kind, onClose }) => (
  <div className="rd-modal-wrap" onClick={onClose}>
    <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
      <span className="rd-modal-icon">✦</span>
      <h2>{AI_FEATURES[kind].title}</h2>
      <p>{AI_FEATURES[kind].text}</p>
      <p className="rd-modal-note">Live AI is switched off in this public demo.</p>
      <div className="rd-modal-actions">
        <a className="rd-button primary" href={CONTACT}>
          Email us for the full demo
        </a>
        <button className="rd-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  </div>
);

// Repaint mode: the piece in its patch of room, a red brush to mark what's
// wrong, and a prompt saying what it should be instead. The fix is written
// over the piece's files in public/, with a backup for Undo.
const Repaint = observer(({ slotId, onClose }) => {
  const slot = slotById(slotId);
  // The style whose picture is on screen. Follow the picture rather than
  // `custom.item`, so a fix always lands on the piece being looked at.
  const el = elementFor(slotId);
  const file = (src) => (src || '').replace(/\?.*$/, '').split('/').pop();
  const shown = slot.background ? store.activePage.background : el.src;
  const item = slot.items.find((i) => file(slot.background ? i.room : i.src) === file(shown)) || itemOf(slot, el);
  if (item.id !== el.custom.item) console.warn('[repaint] on screen', item.id, 'but custom.item', el.custom.item);
  const room = activeRoom();
  const view = React.useRef();
  const paint = React.useRef();
  const [crop, setCrop] = React.useState(null);
  const [size, setSize] = React.useState(40);
  const [prompt, setPrompt] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    let c;
    if (slot.background) c = { x: 0, y: 0, width: room.width, height: room.height };
    else {
      const b = item.baseBox;
      const p = Math.round(Math.max(b.width, b.height) * 0.2);
      c = { x: Math.max(0, b.x - p), y: Math.max(0, b.y - p) };
      c.width = Math.min(room.width, b.x + b.width + p) - c.x;
      c.height = Math.min(room.height, b.y + b.height + p) - c.y;
    }
    const scale = Math.min((window.innerWidth * 0.9) / c.width, (window.innerHeight * 0.66) / c.height);
    const w = Math.round(c.width * scale);
    const h = Math.round(c.height * scale);
    const at = (b) => [(b.x - c.x) * scale, (b.y - c.y) * scale, b.width * scale, b.height * scale];
    Promise.all([
      loadImage(asset(slot.background ? item.room : room.src)),
      slot.background ? null : loadImage(asset(item.src)),
      item.shadow ? loadImage(asset(item.shadow.src)) : null,
    ]).then(([bg, piece, shadow]) => {
      view.current.width = paint.current.width = w;
      view.current.height = paint.current.height = h;
      const ctx = view.current.getContext('2d');
      ctx.drawImage(bg, c.x, c.y, c.width, c.height, 0, 0, w, h);
      // Shadows count by alpha only, as black, like the merged layer.
      if (shadow) {
        const s = document.createElement('canvas');
        s.width = w;
        s.height = h;
        const sc = s.getContext('2d');
        sc.drawImage(shadow, ...at(item.shadow.box));
        sc.globalCompositeOperation = 'source-in';
        sc.fillRect(0, 0, w, h);
        ctx.drawImage(s, 0, 0);
      }
      if (piece) ctx.drawImage(piece, ...at(item.baseBox));
      setCrop({ ...c, scale });
    });
  }, [version]);

  const brush = (e) => {
    if (!(e.buttons & 1) || busy) return;
    const r = paint.current.getBoundingClientRect();
    const k = paint.current.width / r.width;
    const ctx = paint.current.getContext('2d');
    ctx.fillStyle = '#ff2828';
    ctx.beginPath();
    ctx.arc((e.clientX - r.left) * k, (e.clientY - r.top) * k, size / 2, 0, Math.PI * 2);
    ctx.fill();
  };
  const clear = () => paint.current.getContext('2d').clearRect(0, 0, paint.current.width, paint.current.height);

  const send = async (action) => {
    setBusy(true);
    setStatus({ repaint: 'Repainting, about a minute…', erase: 'Erasing…', undo: 'Undoing…' }[action]);
    try {
      const mask = document.createElement('canvas');
      mask.width = crop.width;
      mask.height = crop.height;
      mask.getContext('2d').drawImage(paint.current, 0, 0, crop.width, crop.height);
      const res = await fetch('/__repaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          id: item.id,
          prompt,
          crop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
          mask: action === 'undo' ? null : mask.toDataURL('image/png'),
        }),
      });
      const out = await res.json();
      if (!out.ok) return setStatus(out.error);
      await reload(out.id, out.grow);
      clear();
      setVersion((v) => v + 1);
      setStatus(action === 'undo' ? 'Undone.' : 'Done, saved to public/. Brush again, or close.');
    } catch (err) {
      setStatus(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rd-modal-wrap">
      <div className="rd-fix">
        <div className="rd-fix-head">
          <strong>Fix {slot.label.toLowerCase()} {slot.items.indexOf(item) + 1}</strong>
          <span>Brush over what's wrong, say what it should be.</span>
        </div>
        <div className="rd-fix-canvas">
          <canvas ref={view} />
          <canvas ref={paint} className="rd-fix-paint" onPointerDown={brush} onPointerMove={brush} />
        </div>
        <div className="rd-fix-controls">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. solid wood side panel, no curtain showing through"
            rows={2}
          />
          <label className="rd-fix-size">
            Brush
            <input type="range" min="6" max="160" value={size} onChange={(e) => setSize(+e.target.value)} />
          </label>
        </div>
        <div className="rd-modal-actions">
          <button className="rd-button primary" disabled={busy || !crop} onClick={() => send('repaint')}>
            Repaint with AI
          </button>
          {!slot.background && (
            <button className="rd-button" disabled={busy || !crop} onClick={() => send('erase')}>
              Erase (cut away)
            </button>
          )}
          <button className="rd-button" disabled={busy} onClick={clear}>
            Clear brush
          </button>
          <button className="rd-button" disabled={busy} onClick={() => send('undo')}>
            Undo last fix
          </button>
          <button className="rd-button" disabled={busy} onClick={onClose}>
            Close
          </button>
        </div>
        {status && <p className="rd-modal-note">{status}</p>}
      </div>
    </div>
  );
});

// --- app -----------------------------------------------------------------

function useMedia(query) {
  const [match, setMatch] = React.useState(() => window.matchMedia(query).matches);
  React.useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatch(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return match;
}

const App = observer(() => {
  const [slotId, setSlotId] = React.useState(null);
  const [room, setRoom] = React.useState(ROOMS[0].id);
  const [ai, setAi] = React.useState(null);
  const [fix, setFix] = React.useState(null);
  const [lightId, setLightId] = React.useState(light);
  const [relighting, setRelighting] = React.useState(false);
  // Phones get the room edge to edge; the 720px breakpoint matches styles.css.
  const narrow = useMedia('(max-width: 720px)');
  const pad = narrow ? { x: 0, y: 0 } : { x: 20, y: 20 };
  useZoomFloor(pad);

  // Tapping a piece on the canvas opens it in the sidebar.
  React.useEffect(
    () =>
      reaction(
        () => store.selectedElements[0]?.name,
        (name) => name && setSlotId(name),
      ),
    [],
  );

  const pick = (id) => {
    setSlotId(id);
    const el = elementFor(id);
    store.selectElements(el.visible ? [el.id] : []);
  };

  const switchRoom = (id) => {
    setRoom(id);
    setSlotId(null);
    store.selectElements([]);
    store.selectPage(pageFor(id).id);
  };

  const switchLight = async (id) => {
    setLightId(id);
    // Show progress only if it isn't instant.
    const slow = setTimeout(() => setRelighting(true), 150);
    await crossfade(() => setLight(id));
    clearTimeout(slow);
    setRelighting(false);
  };

  const download = async () => {
    store.selectElements([]);
    const url = await store.toDataURL({ mimeType: 'image/jpeg', pixelRatio: 0.75, pageId: store.activePage.id });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'room.jpg';
    a.click();
  };

  return (
    <div className="rd-app">
      <aside className="rd-sidebar">
        <header className="rd-head">
          <div className="rd-title">
            Mood <span className="rd-tag">v0.1</span>
          </div>
          {/* Phones switch the light from the header, as icons */}
          <div className="rd-head-lights">
            {LIGHTS.map((l) => (
              <button
                key={l.id}
                className={l.id === lightId ? 'rd-icon on' : 'rd-icon'}
                onClick={() => switchLight(l.id)}
                aria-label={l.label}
                title={l.label}
              >
                <Icon d={ICONS[l.id]} size={18} />
              </button>
            ))}
          </div>
          <Actions onDownload={download} />
        </header>
        <div className="rd-side-body">
          <section className="rd-room-section">
            <h3>Room</h3>
            <Rooms room={room} onChange={switchRoom} />
            <div className="rd-slots">
              {LIGHTS.map((l) => (
                <button key={l.id} className={l.id === lightId ? 'rd-slot on' : 'rd-slot'} onClick={() => switchLight(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>Furniture</h3>
            <Furniture slotId={slotId} onPick={pick} onAi={setAi} onFix={setFix} />
          </section>
        </div>
      </aside>

      <main className="rd-stage">
        <Workspace
          store={store}
          backgroundColor="#161616"
          pageControlsEnabled={false}
          renderOnlyActivePage
          paddingX={pad.x}
          paddingY={pad.y}
          components={{ Tooltip: () => null, ContextMenu: () => null }}
          pageBorderColor="transparent"
          activePageBorderColor="transparent"
          highlighterStyle={{ stroke: 'rgba(255,255,255,0.75)', strokeWidth: 1.5 }}
          transformerStyle={{
            borderStroke: 'rgba(255,255,255,0.9)',
            borderStrokeWidth: 1,
            borderDash: [5, 5],
            anchorFill: '#ffffff',
            anchorStroke: 'rgba(0,0,0,0.2)',
            anchorStrokeWidth: 1,
            anchorSize: 11,
            anchorCornerRadius: 6,
            rotateEnabled: false,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
            keepRatio: true,
          }}
        />
        <Markers active={slotId} onPick={pick} />
        {relighting && <div className="rd-busy">Relighting…</div>}
      </main>

      {ai && <AiOff kind={ai} onClose={() => setAi(null)} />}
      {fix && <Repaint slotId={fix} onClose={() => setFix(null)} />}
    </div>
  );
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
