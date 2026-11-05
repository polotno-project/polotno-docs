// Small previews of a design, drawn as one SVG from the parts' own SVGs.
// No canvas render needed, so starter cards and saved designs show at once.

import { PX, PAGE_MM, drawingFor, boxAt, applySettingCustom } from './parts.js';

const W = PAGE_MM.width * PX;
const H = PAGE_MM.height * PX;

function compose(items) {
  const body = items
    .map((it) => {
      const href = it.src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      return `<image href="${href}" x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}" preserveAspectRatio="none" transform="rotate(${it.rotation || 0} ${it.x} ${it.y})"/>`;
    })
    .join('');
  // Crop to the ring with a little air, as a square.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of items) {
    const r = Math.hypot(it.width, it.height) / 2;
    const a = ((it.rotation || 0) * Math.PI) / 180;
    const cx = it.x + (it.width / 2) * Math.cos(a) - (it.height / 2) * Math.sin(a);
    const cy = it.y + (it.width / 2) * Math.sin(a) + (it.height / 2) * Math.cos(a);
    const hw = it.rotation ? r : it.width / 2;
    const hh = it.rotation ? r : it.height / 2;
    x0 = Math.min(x0, cx - hw); x1 = Math.max(x1, cx + hw);
    y0 = Math.min(y0, cy - hh); y1 = Math.max(y1, cy + hh);
  }
  if (!items.length) { x0 = 0; y0 = 0; x1 = W; y1 = H; }
  const side = Math.max(x1 - x0, y1 - y0) * 1.08;
  const vx = (x0 + x1) / 2 - side / 2;
  const vy = (y0 + y1) / 2 - side / 2;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${side} ${side}">${body}</svg>`,
  );
}

// Preview of the live page.
export function pageThumb(page) {
  return compose(page.children.filter((e) => e.visible).map((e) => e));
}

// Preview of a starter, built from its recipe and cropped to the ring.
export function starterThumb(starter) {
  const items = [];
  const metal = starter.parts.find((p) => p.custom.metal)?.custom.metal || 'white';
  for (const p of starter.parts) {
    const [dx, dy] = p.at || [0, 0];
    const c = { x: W / 2 + dx * PX, y: H / 2 + dy * PX };
    const rot = p.rotation || 0;
    const d = drawingFor(p.custom);
    items.push({ src: d.src, rotation: rot, ...boxAt(c, d.width, d.height, rot) });
    if (p.setting) {
      const s = drawingFor(applySettingCustom(p.custom, p.setting, metal));
      items.push({ src: s.src, rotation: rot, ...boxAt(c, s.width, s.height, rot) });
    }
  }
  return compose(items);
}
