// Metal parts, drawn in code as top views at their real size.
//
// Drawing units are tenths of a millimetre, so a 22 mm shank is 220 wide.
// Every part is drawn once per metal from the same shapes, which is how the
// metal switch works: it swaps the drawing, never the geometry.

import { outlineOf, gemBody } from './gems.js';

export const METALS = [
  { id: 'white', label: 'White gold', swatch: '#d9dde2', ramp: ['#3a3f46', '#6d747e', '#adb3bb', '#dfe3e8', '#ffffff'] },
  { id: 'yellow', label: 'Yellow gold', swatch: '#e2b650', ramp: ['#553709', '#966a1d', '#d3a33d', '#f2d47f', '#fff5d2'] },
  { id: 'rose', label: 'Rose gold', swatch: '#dc9c84', ramp: ['#552619', '#955341', '#d18f75', '#f0c1ad', '#fff0e8'] },
];
export const metalById = (id) => METALS.find((m) => m.id === id) || METALS[0];

const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

function doc(w, h, defs, body, pad = 4) {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w + pad * 2}" height="${h + pad * 2}" viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}"><defs>${defs}</defs>${body}</svg>`,
  );
}

// Shared gradients. Polished metal mirrors the studio: a sharp key light, a
// dark band, and a softer rim light, rather than one smooth sheen. Plus a
// bead for prongs and a shadow blur.
// A satin (brushed) finish diffuses the light: one soft sheen, no sharp
// reflections.
function metalDefs(m, finish = 'polished') {
  const [deep, dark, mid, light, hi] = m.ramp;
  const tube =
    finish === 'satin'
      ? `<stop offset="0" stop-color="${deep}"/><stop offset="0.14" stop-color="${dark}"/>
    <stop offset="0.36" stop-color="${mid}"/><stop offset="0.5" stop-color="${light}"/>
    <stop offset="0.66" stop-color="${mid}"/><stop offset="0.88" stop-color="${dark}"/>
    <stop offset="1" stop-color="${deep}"/>`
      : `<stop offset="0" stop-color="${deep}"/><stop offset="0.1" stop-color="${mid}"/>
    <stop offset="0.24" stop-color="${hi}"/><stop offset="0.32" stop-color="${hi}"/>
    <stop offset="0.42" stop-color="${light}"/><stop offset="0.56" stop-color="${dark}"/>
    <stop offset="0.66" stop-color="${deep}"/><stop offset="0.8" stop-color="${mid}"/>
    <stop offset="0.9" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>`;
  return `
  <linearGradient id="tube" x1="0" y1="0" x2="0" y2="1">
    ${tube}
  </linearGradient>
  <linearGradient id="diag" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${hi}"/><stop offset="0.22" stop-color="${light}"/>
    <stop offset="0.45" stop-color="${dark}"/><stop offset="0.6" stop-color="${mid}"/>
    <stop offset="0.8" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
  </linearGradient>
  <radialGradient id="bead" cx="0.36" cy="0.32" r="0.75">
    <stop offset="0" stop-color="#fff"/><stop offset="0.16" stop-color="${hi}"/>
    <stop offset="0.42" stop-color="${light}"/><stop offset="0.72" stop-color="${dark}"/>
    <stop offset="0.9" stop-color="${mid}"/><stop offset="1" stop-color="${deep}"/>
  </radialGradient>
  <radialGradient id="lobe" cx="0.4" cy="0.34" r="0.7">
    <stop offset="0" stop-color="${hi}"/><stop offset="0.18" stop-color="${light}"/>
    <stop offset="0.42" stop-color="${mid}"/><stop offset="0.6" stop-color="${dark}"/>
    <stop offset="0.78" stop-color="${light}"/><stop offset="0.92" stop-color="${mid}"/><stop offset="1" stop-color="${deep}"/>
  </radialGradient>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>`;
}

// A curved wire shaded like a polished tube: stacked strokes, dark outside,
// bright core. Works along any path.
function tube(d, width, m) {
  const [deep, dark, mid, light, hi] = m.ramp;
  return [
    [deep, 1],
    [mid, 0.82],
    [dark, 0.6],
    [light, 0.42],
    [hi, 0.2],
  ]
    .map(([c, f]) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${width * f}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('') + `<path d="${d}" fill="none" stroke="url(#turn)" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// Fill a shape with the tube gradient.
// Fill a shape with the tube gradient, then shade its ends inside the same shape.
const band = (shape) => shape.replace('FILL', 'url(#tube)') + shape.replace('FILL', 'url(#turn)');

// Seen from above, a band turns down round the finger at both ends. Its
// outline ends in a slightly rounded cap (drawn in each shape), and the
// metal darkens toward the ends as its surface faces away from the light.
// The darkening is painted inside the band's own shapes (`url(#turn)`), so
// nothing shows outside the metal and the part works on any background.
function turnAway(w, h, body) {
  return `<linearGradient id="turn" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${w}" y2="0">` +
    `<stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.2" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="0.8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>${body}`;
}

// --- shanks --------------------------------------------------------------------

// Each shank lies across the canvas the way a ring sits face up: the band
// runs left to right and the head goes in the middle.
const SHANK_DRAW = {
  classic: (m) => {
    const w = 220, h = 24;
    return { w, h, body: band(`<path d="M10,0 L210,0 A10,12 0 0 1 210,24 L10,24 A10,12 0 0 1 10,0 Z" fill="FILL"/>`) };
  },
  tapered: (m) => {
    const w = 220, h = 38;
    return { w, h, body: band(`<path d="M7,9 Q110,-9 213,9 A7,10 0 0 1 213,29 Q110,47 7,29 A7,10 0 0 1 7,9 Z" fill="FILL"/>`) };
  },
  knife: (m) => {
    const w = 220, h = 26;
    const [deep, dark, mid, light, hi] = m.ramp;
    const body = `
      <linearGradient id="k1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${hi}"/></linearGradient>
      <linearGradient id="k2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mid}"/><stop offset="1" stop-color="${deep}"/></linearGradient>
      <path d="M8,4 Q110,-2 212,4 A8,9 0 0 1 212,22 Q110,28 8,22 A8,9 0 0 1 8,4 Z" fill="url(#k2)"/>
      <path d="M8,4 Q110,-2 212,4 A8,9 0 0 1 220,13 L0,13 A8,9 0 0 1 8,4 Z" fill="url(#k1)"/>
      <path d="M1,13 L219,13" stroke="${hi}" stroke-width="1.2"/>
      <path d="M8,4 Q110,-2 212,4 A8,9 0 0 1 212,22 Q110,28 8,22 A8,9 0 0 1 8,4 Z" fill="url(#turn)"/>`;
    return { w, h, body };
  },
  split: (m) => {
    const w = 220, h = 84;
    const top = 'M0,42 C40,42 55,10 110,10 C165,10 180,42 220,42';
    const bot = 'M0,42 C40,42 55,74 110,74 C165,74 180,42 220,42';
    const body = `${tube(top, 17, m)}${tube(bot, 17, m)}`;
    return { w, h, body };
  },
  bypass: (m) => {
    const w = 220, h = 84;
    const a = 'M0,42 C45,42 60,10 102,10 C140,10 155,42 220,42';
    const b = 'M0,42 C65,42 80,74 118,74 C160,74 175,42 220,42';
    const body = `${tube(b, 16, m)}${tube(a, 16, m)}`;
    return { w, h, body };
  },
  bow: (m) => {
    // Two rounded lobes meeting at a centre hub, like a bow.
    const w = 220, h = 110;
    const left = 'M110,55 C82,22 38,8 14,26 C0,38 0,72 14,84 C38,102 82,88 110,55 Z';
    const right = 'M110,55 C138,22 182,8 206,26 C220,38 220,72 206,84 C182,102 138,88 110,55 Z';
    const body = `
      <path d="${left}" fill="url(#lobe)"/><path d="${right}" fill="url(#lobe)"/>
      <path d="${left}" fill="url(#turn)"/><path d="${right}" fill="url(#turn)"/>
      <circle cx="110" cy="55" r="15" fill="url(#bead)"/>`;
    return { w, h, body };
  },
  channel: (m) => {
    const w = 220, h = 34;
    const [deep, dark] = m.ramp;
    const body = `
      ${band(`<path d="M12,0 L208,0 A12,17 0 0 1 208,34 L12,34 A12,17 0 0 1 12,0 Z" fill="FILL"/>`)}
      <path d="M12,8 L208,8 A6,9 0 0 1 208,26 L12,26 A6,9 0 0 1 12,8 Z" fill="${deep}"/>
      <path d="M12,8 L208,8" stroke="${dark}" stroke-width="2"/>`;
    return { w, h, body };
  },
  cathedral: (m) => {
    const w = 220, h = 80;
    return {
      w,
      h,
      body: band(`<path d="M8,29 L40,29 C80,29 88,14 96,8 L124,8 C132,14 140,29 180,29 L212,29 A8,11 0 0 1 212,51 L180,51 C140,51 132,66 124,72 L96,72 C88,66 80,51 40,51 L8,51 A8,11 0 0 1 8,29 Z" fill="FILL"/>`, w, h),
    };
  },
};

export const SHANKS = [
  { id: 'classic', label: 'Classic band' },
  { id: 'tapered', label: 'Tapered' },
  { id: 'knife', label: 'Knife edge' },
  { id: 'cathedral', label: 'Cathedral' },
  { id: 'split', label: 'Split shank' },
  { id: 'bypass', label: 'Bypass' },
  { id: 'bow', label: 'Bow' },
  { id: 'channel', label: 'Channel' },
];

// Raw drawing for measuring (see SHANK_BOUNDS).
export function shankDrawing(shankId, metalId = 'white') {
  const m = metalById(metalId);
  return { ...SHANK_DRAW[shankId](m), defs: metalDefs(m) };
}

// Visible bounds of each shank in drawing units [x0, y0, x1, y1], measured
// in the browser with getBBox (plus half the stroke for wire shanks). The
// element box is cropped to exactly these, so its size in mm is the band's
// real size, not the size of the drawing around it.
const SHANK_BOUNDS = {
  classic: [0, 0, 220, 24],
  tapered: [0, 0, 220, 38],
  knife: [0, 1, 220, 25],
  cathedral: [0, 8, 220, 72],
  split: [-8.5, 1.5, 228.5, 82.5],
  bypass: [-8, 2, 228, 82],
  bow: [3.5, 18.1, 216.5, 91.9],
  channel: [0, 0, 220, 34],
};

export const FINISHES = [
  { id: 'polished', label: 'Polished' },
  { id: 'satin', label: 'Satin' },
];

// SVG and size in mm for a shank in a metal and finish. The drawing
// stretches to its box (preserveAspectRatio none), which is how band width
// changes without redrawing.
export function shankPart(shankId, metalId, finish = 'polished') {
  const m = metalById(metalId);
  const { w, h, body } = SHANK_DRAW[shankId](m);
  const [x0, y0, x1, y1] = SHANK_BOUNDS[shankId];
  const bw = x1 - x0;
  const bh = y1 - y0;
  const src = svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="${x0} ${y0} ${bw} ${bh}" preserveAspectRatio="none"><defs>${metalDefs(m, finish)}</defs>${turnAway(w, h, body)}</svg>`,
  );
  return { src, width: bw / 10, height: bh / 10 };
}

// --- settings (heads) ------------------------------------------------------------

export const SETTINGS = [
  { id: 'prong4', label: '4 prongs' },
  { id: 'prong6', label: '6 prongs' },
  { id: 'bezel', label: 'Bezel' },
  { id: 'halo', label: 'Halo' },
];

// How far the setting reaches past the stone, as a share of the stone's size.
export const REACH = { prong4: 1.24, prong6: 1.24, bezel: 1.3, halo: 1.72 };

// SVG and size in mm for a setting that fits a stone of `cutId`,
// `width` x `height` mm. The stone sits in the middle of the box.
export function settingPart(settingId, metalId, cutId, width, height, haloStoneId = 'diamond') {
  const m = metalById(metalId);
  const k = REACH[settingId];
  const W = width * 10 * k;
  const H = height * 10 * k;
  const o = outlineOf(cutId);
  // Stone outline in setting space, around the box centre.
  const sx = (width * 10) / o.w;
  const sy = (height * 10) / o.h;
  const cx = W / 2;
  const cy = H / 2;
  const at = (s) => o.pts.map(([x, y]) => [cx + (x - o.w / 2) * sx * s, cy + (y - o.h / 2) * sy * s]);
  const path = (pts) => 'M' + pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join('L') + 'Z';
  const minSide = Math.min(width, height) * 10;
  let body = '';

  if (settingId === 'prong4' || settingId === 'prong6') {
    const n = settingId === 'prong4' ? 4 : 6;
    // Prong tips are about 16% of the stone's width, between 0.55 and 1.1 mm
    // across (drawing units are 0.1 mm).
    const r = Math.min(5.5, Math.max(2.75, minSide * 0.08));
    const start = n === 4 ? -135 : -90;
    // Prongs sit on the stone's edge, found by the nearest outline point at
    // each angle, so they follow any cut.
    const ring = at(0.97);
    const c = [(o.center[0] - o.w / 2) * sx + cx, (o.center[1] - o.h / 2) * sy + cy];
    for (let i = 0; i < n; i++) {
      const a = ((start + (360 / n) * i) * Math.PI) / 180;
      let best = ring[0];
      let bestDot = -Infinity;
      for (const p of ring) {
        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        const len = Math.hypot(dx, dy) || 1;
        const dot = (dx * Math.cos(a) + dy * Math.sin(a)) / len;
        if (dot > bestDot) {
          bestDot = dot;
          best = p;
        }
      }
      body += `<ellipse cx="${best[0] + r * 0.18}" cy="${best[1] + r * 0.28}" rx="${r * 1.1}" ry="${r}" fill="#000" opacity="0.45" filter="url(#soft)"/>`;
      body += `<circle cx="${best[0]}" cy="${best[1]}" r="${r}" fill="url(#bead)"/>`;
    }
  } else if (settingId === 'bezel') {
    body = `<path d="${path(at(1.16))} ${path(at(0.93))}" fill="url(#diag)" fill-rule="evenodd"/>
      <path d="${path(at(0.93))}" fill="none" stroke="${m.ramp[4]}" stroke-width="1.2" opacity="0.9"/>
      <path d="${path(at(1.16))}" fill="none" stroke="${m.ramp[0]}" stroke-opacity="0.5" stroke-width="0.6"/>`;
  } else if (settingId === 'halo') {
    // A metal frame with a ring of small round stones around the centre.
    body = `<path d="${path(at(1.6))} ${path(at(0.95))}" fill="url(#diag)" fill-rule="evenodd"/>
      <path d="${path(at(1.6))}" fill="none" stroke="${m.ramp[0]}" stroke-opacity="0.5" stroke-width="0.6"/>`;
    const track = at(1.28);
    // Halo stones are sized to fit the frame, at least 0.9 mm.
    const d = Math.max(9, minSide * 0.22);
    let per = 0;
    for (let i = 0; i < track.length; i++) {
      const [x1, y1] = track[i];
      const [x2, y2] = track[(i + 1) % track.length];
      per += Math.hypot(x2 - x1, y2 - y1);
    }
    const count = Math.max(8, Math.floor(per / (d * 1.12)));
    const small = gemBody('round', haloStoneId);
    const step = per / count;
    let acc = 0;
    let next = 0;
    let placed = 0;
    for (let i = 0; i < track.length && placed < count; i++) {
      const [x1, y1] = track[i];
      const [x2, y2] = track[(i + 1) % track.length];
      const seg = Math.hypot(x2 - x1, y2 - y1);
      while (next <= acc + seg && placed < count) {
        const t = (next - acc) / seg;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        body += `<g transform="translate(${x - d / 2} ${y - d / 2}) scale(${d / 100})">${small.markup}</g>`;
        placed++;
        next += step;
      }
      acc += seg;
    }
  }
  return { src: doc(W, H, metalDefs(m), body), width: W / 10 + 0.8, height: H / 10 + 0.8 };
}

// Light, mid and dark of a metal, for beads drawn elsewhere (pavé).
export const beadColors = (metalId) => {
  const r = metalById(metalId).ramp;
  return [r[4], r[2], r[0]];
};
