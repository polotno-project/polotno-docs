// Gemstones, drawn in code as faceted top views.
//
// Every cut is an outline plus a facet map. Brilliant cuts (round, oval,
// pear, marquise, heart, cushion) share one facet map: it's built on a
// circle and stretched onto the cut's outline, the way real modified
// brilliants are. Step cuts (emerald, princess) get their own rings of
// facets. Each facet is shaded from its angle to a light in the top left,
// so one drawing works for any stone colour.

// Shades from dark to light. Facets pick a point on this ramp.
export const STONES = [
  { id: 'diamond', label: 'Diamond', ramp: ['#141a22', '#4b5563', '#9aa6b5', '#dfe7f0', '#ffffff'], contrast: 1.35 },
  { id: 'ruby', label: 'Ruby', ramp: ['#2e030c', '#6e0a1f', '#b8163a', '#ea5470', '#ffc9d3'], contrast: 1 },
  { id: 'sapphire', label: 'Sapphire', ramp: ['#050f33', '#0c2670', '#1d4bbd', '#5a8bef', '#d3e2ff'], contrast: 1 },
  { id: 'emerald', label: 'Emerald', ramp: ['#012517', '#055136', '#0d8456', '#3cbf87', '#c6f3dc'], contrast: 1 },
  { id: 'amethyst', label: 'Amethyst', ramp: ['#1d0833', '#431770', '#7639b8', '#ab7be6', '#ebdbff'], contrast: 1 },
  { id: 'morganite', label: 'Morganite', ramp: ['#3f1d1a', '#86443e', '#cf8580', '#f1bab4', '#fff0ee'], contrast: 0.9 },
];

// `aspect` is width / length. A stone's size is its length in mm, measured
// north to south as it sits in the ring.
export const CUTS = [
  { id: 'round', label: 'Round', aspect: 1 },
  { id: 'oval', label: 'Oval', aspect: 0.72 },
  { id: 'pear', label: 'Pear', aspect: 0.66 },
  { id: 'marquise', label: 'Marquise', aspect: 0.5 },
  { id: 'cushion', label: 'Cushion', aspect: 1 },
  { id: 'heart', label: 'Heart', aspect: 1 },
  { id: 'princess', label: 'Princess', aspect: 1 },
  { id: 'emerald', label: 'Emerald', aspect: 0.72 },
];

export const SIZES_MM = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10];

export const stoneById = (id) => STONES.find((s) => s.id === id) || STONES[0];
export const cutById = (id) => CUTS.find((c) => c.id === id) || CUTS[0];

// Carat weight of a round diamond from its diameter, the usual trade rule.
export const roundDiamondCarat = (mm) => Math.round(Math.pow(mm / 6.5, 3) * 100) / 100;

// --- geometry ---------------------------------------------------------------

// Drawing units: the long side of every stone is 100.
const L = 100;
const TAU = Math.PI * 2;

function sample(n, fn) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(fn((i / n) * TAU));
  return pts;
}

// Outline of a cut as a closed polygon in a w x h box, plus the point the
// facet map radiates from.
export function outlineOf(cutId) {
  const cut = cutById(cutId);
  const w = L * cut.aspect;
  const h = L;
  let pts;
  let center = [w / 2, h / 2];
  switch (cut.id) {
    case 'oval':
      pts = sample(160, (t) => [w / 2 + (w / 2) * Math.cos(t), h / 2 + (h / 2) * Math.sin(t)]);
      break;
    case 'pear': {
      // A teardrop: x = sin t · sin(t/2), point up.
      const raw = sample(200, (t) => [Math.sin(t) * Math.sin(t / 2), -Math.cos(t)]);
      pts = fit(raw, w, h);
      center = [w / 2, h * 0.6];
      break;
    }
    case 'marquise': {
      // Two circular arcs meeting in points at top and bottom.
      const d = (h * h - w * w) / (4 * w);
      const r = w / 2 + d;
      const a0 = Math.atan2(h / 2, d);
      const right = [];
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const a = -a0 + (2 * a0 * i) / steps;
        right.push([w / 2 - d + r * Math.cos(a), h / 2 + r * Math.sin(a)]);
      }
      const left = right.slice(1, -1).map(([x, y]) => [w - x, h - y]);
      pts = [...right, ...left];
      break;
    }
    case 'heart': {
      const raw = sample(220, (t) => [
        16 * Math.pow(Math.sin(t), 3),
        -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
      ]);
      pts = fit(raw, w, h);
      center = [w / 2, h * 0.45];
      break;
    }
    case 'cushion': {
      // A squircle: square with soft corners.
      const n = 3;
      pts = sample(200, (t) => {
        const c = Math.cos(t);
        const s = Math.sin(t);
        return [
          w / 2 + (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
          h / 2 + (h / 2) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n),
        ];
      });
      break;
    }
    case 'princess':
      pts = [[0, 0], [w, 0], [w, h], [0, h]];
      break;
    case 'emerald': {
      const c = w * 0.16;
      pts = [[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]];
      break;
    }
    default:
      pts = sample(160, (t) => [w / 2 + (w / 2) * Math.cos(t), h / 2 + (h / 2) * Math.sin(t)]);
  }
  return { w, h, pts, center };
}

function fit(raw, w, h) {
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  return raw.map(([x, y]) => [((x - x0) / (x1 - x0)) * w, ((y - y0) / (y1 - y0)) * h]);
}

// Distance from `c` to the outline along angle `a`.
function rayLength(pts, c, a) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    const ex = x2 - x1;
    const ey = y2 - y1;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((x1 - c[0]) * ey - (y1 - c[1]) * ex) / den;
    const u = ((x1 - c[0]) * dy - (y1 - c[1]) * dx) / den;
    if (t > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.min(best, t);
  }
  return best === Infinity ? 0 : best;
}

// A point on the stretched facet map: angle `a`, fraction `f` of the way out.
const mapper = (o) => (a, f) => {
  const r = rayLength(o.pts, o.center, a) * f;
  return [o.center[0] + r * Math.cos(a), o.center[1] + r * Math.sin(a)];
};

// --- shading ----------------------------------------------------------------

const LIGHT = (-3 * Math.PI) / 4; // top left

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function hex(c) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}

function rampColor(ramp, v) {
  const t = Math.max(0, Math.min(0.9999, v)) * (ramp.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  const a = hex(ramp[i]);
  const b = hex(ramp[i + 1]);
  const m = a.map((x, k) => Math.round(x + (b[k] - x) * f));
  return `rgb(${m.join(',')})`;
}

// Brightness of a facet facing angle `a`, tilted by `tilt` (0 = flat table).
function shade(stone, a, tilt, seed, base = 0.55) {
  const facing = Math.cos(a - LIGHT);
  const noise = (hash(seed) - 0.5) * 0.5 * stone.contrast;
  return base + facing * 0.3 * tilt * stone.contrast + noise;
}

const poly = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L') + 'Z';

// A drawing context: collects gradients so every facet can have its own soft
// tonal sweep instead of a flat fill. Ids carry the cut and stone so several
// stones can share one SVG (pavé rows, halos) without clashing.
function context(cutId, stone) {
  return { defs: [], n: 0, prefix: `g-${cutId}-${stone.id}`, stone };
}

// Real diamonds scintillate: facets read either bright or dark, rarely grey.
// Coloured stones keep a softer tonal range.
function tone(stone, v) {
  if (stone.id !== 'diamond') return v;
  return v < 0.5 ? v * 0.62 : 1 - (1 - v) * 0.55;
}

// One facet: a gradient from a lighter to a darker version of its tone,
// along the light direction, with a faint hairline edge.
function facet(ctx, pts, v, { spread = 0.16, seed = 0 } = {}) {
  const { stone } = ctx;
  const id = `${ctx.prefix}-${ctx.n++}`;
  const t = tone(stone, v);
  const sweep = spread * (0.6 + hash(seed + 3.1) * 0.8);
  // Gradient direction turns a little per facet, like real reflections.
  const ang = LIGHT + Math.PI + (hash(seed + 7.7) - 0.5) * 1.2;
  const x = 0.5 + Math.cos(ang) * 0.5;
  const y = 0.5 + Math.sin(ang) * 0.5;
  ctx.defs.push(
    `<linearGradient id="${id}" x1="${(1 - x).toFixed(2)}" y1="${(1 - y).toFixed(2)}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}">` +
      `<stop offset="0" stop-color="${rampColor(stone.ramp, t + sweep)}"/><stop offset="1" stop-color="${rampColor(stone.ramp, t - sweep)}"/></linearGradient>`,
  );
  // Diamonds throw a little colour ("fire") on a few facets.
  let fire = '';
  if (stone.id === 'diamond' && hash(seed + 11.3) < 0.1) {
    const c = hash(seed + 5.9) < 0.5 ? '255,170,80' : '90,160,255';
    fire = `<path d="${poly(pts)}" fill="rgba(${c},0.1)"/>`;
  }
  return `<path d="${poly(pts)}" fill="url(#${id})"/>${fire}`;
}

// Facet edges, drawn once over all facets as faint hairlines.
const edgeStyle = (stone) =>
  stone.id === 'diamond' ? 'stroke="rgba(255,255,255,0.28)" stroke-width="0.35"' : `stroke="${rampColor(stone.ramp, 0.9)}" stroke-opacity="0.32" stroke-width="0.35"`;

// --- facet maps ---------------------------------------------------------------

function brilliant(o, ctx, seed) {
  const { stone } = ctx;
  const P = mapper(o);
  const fills = [];
  const edges = [];
  const k = 8;
  const step = TAU / k;
  const rot = -Math.PI / 2 + step / 2;
  const FT = 0.56; // table
  const FS = 0.79; // star points
  const arc = (a0, a1) => {
    const n = 8;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(P(a0 + ((a1 - a0) * i) / n, 1));
    return pts;
  };
  for (let i = 0; i < k; i++) {
    const a = rot + i * step; // table vertex
    const aN = a + step;
    const aS = a + step / 2; // star point
    const T = P(a, FT);
    const TN = P(aN, FT);
    const S = P(aS, FS);
    const SP = P(a - step / 2, FS);
    const star = [T, TN, S];
    const kite = [T, SP, P(a, 1), S];
    const g1 = [S, ...arc(a, aS)];
    const g2 = [S, ...arc(aS, aN)];
    fills.push(facet(ctx, star, shade(stone, aS, 0.6, seed + i * 7 + 1, 0.6), { seed: seed + i * 7 + 1 }));
    fills.push(facet(ctx, kite, shade(stone, a, 1, seed + i * 7 + 2, 0.52), { seed: seed + i * 7 + 2, spread: 0.2 }));
    fills.push(facet(ctx, g1, shade(stone, aS - step / 4, 1.2, seed + i * 7 + 3, 0.44), { seed: seed + i * 7 + 3 }));
    fills.push(facet(ctx, g2, shade(stone, aS + step / 4, 1.2, seed + i * 7 + 4, 0.44), { seed: seed + i * 7 + 4 }));
    edges.push(poly(star), poly(kite), `M${S[0].toFixed(2)},${S[1].toFixed(2)}L${P(aS, 1).map((v) => v.toFixed(2)).join(',')}`);
  }
  // The table: a bright window with the pavilion showing through it as eight
  // soft wedges that point at the table corners.
  const table = [];
  for (let i = 0; i < k; i++) table.push(P(rot + i * step, FT));
  fills.push(facet(ctx, table, 0.5 + 0.22 * stone.contrast, { seed: seed + 91, spread: 0.12 }));
  // The pavilion below reflects up through the crown: sixteen long facets
  // from the centre to the girdle, alternating light and dark. Drawn faintly
  // over everything, they break the big crown facets up the way a real
  // stone's do.
  const c = o.center;
  const refl = [];
  const reflEdges = [];
  for (let i = 0; i < k * 2; i++) {
    const b0 = rot + (i * step) / 2;
    const b1 = b0 + step / 2;
    const dark = (i + Math.floor(hash(seed + 200 + i) * 2)) % 2 === 0;
    refl.push(`<path d="${poly([c, P(b0, 1.02), P((b0 + b1) / 2, 1.02), P(b1, 1.02)])}" fill="${dark ? '#000' : '#fff'}" opacity="${(dark ? 0.16 : 0.12) * stone.contrast}"/>`);
    reflEdges.push(`M${c[0].toFixed(2)},${c[1].toFixed(2)}L${P(b0, 1).map((v) => v.toFixed(2)).join(',')}`);
  }
  fills.push(refl.join(''));
  fills.push(`<path d="${reflEdges.join('')}" fill="none" stroke="${stone.id === 'diamond' ? '#fff' : rampColor(stone.ramp, 0.9)}" stroke-opacity="0.12" stroke-width="0.3"/>`);
  // Through the table they show as eight sharper arrows.
  const wedges = [];
  for (let i = 0; i < k; i++) {
    const a = rot + i * step;
    const arrow = [P(a, 0.12), P(a - step * 0.06, FT * 0.9), P(a, FT * 0.82), P(a + step * 0.06, FT * 0.9)];
    wedges.push(`<path d="${poly(arrow)}" fill="${rampColor(stone.ramp, tone(stone, 0.3))}" opacity="0.4"/>`);
  }
  fills.push(wedges.join(''));
  edges.push(poly(table));
  return fills.join('') + `<path d="${edges.join('')}" fill="none" ${edgeStyle(stone)} stroke-linejoin="round"/>`;
}

// Concentric rings of facets between scaled copies of the outline.
function stepCut(o, ctx, seed, rings, tableX) {
  const { stone } = ctx;
  const fills = [];
  const edges = [];
  const c = o.center;
  const scale = (pts, s) => pts.map(([x, y]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s]);
  for (let r = 0; r < rings.length - 1; r++) {
    const a = scale(o.pts, rings[r]);
    const b = scale(o.pts, rings[r + 1]);
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      const mid = [(a[i][0] + a[j][0]) / 2, (a[i][1] + a[j][1]) / 2];
      const ang = Math.atan2(mid[1] - c[1], mid[0] - c[0]);
      const base = 0.44 + (r % 2 ? 0.12 : -0.04);
      const quad = [a[i], a[j], b[j], b[i]];
      fills.push(facet(ctx, quad, shade(stone, ang, 1.2, seed + r * 31 + i, base), { seed: seed + r * 31 + i, spread: 0.2 }));
      edges.push(poly(quad));
    }
  }
  const table = scale(o.pts, rings[rings.length - 1]);
  fills.push(facet(ctx, table, 0.62, { seed: seed + 77, spread: 0.1 }));
  edges.push(poly(table));
  if (tableX) {
    // Princess: pavilion chevrons reflect as a soft X of light and dark.
    const parts = [];
    for (let i = 0; i < table.length; i++) {
      const j = (i + 1) % table.length;
      const mid = [(table[i][0] + table[j][0]) / 2, (table[i][1] + table[j][1]) / 2];
      parts.push(facet(ctx, [c, table[i], mid], 0.5 + (i % 2 ? 0.24 : -0.16) * stone.contrast, { seed: seed + 40 + i }));
      parts.push(facet(ctx, [c, mid, table[j]], 0.5 + (i % 2 ? -0.16 : 0.24) * stone.contrast, { seed: seed + 60 + i }));
    }
    fills.push(`<g opacity="0.85">${parts.join('')}</g>`);
  } else {
    // Emerald: the pavilion steps show through as a hall of mirrors.
    [0.72, 0.46].forEach((s, n) => {
      fills.push(facet(ctx, scale(table, s), n ? 0.74 : 0.42, { seed: seed + 80 + n, spread: 0.12 }));
      edges.push(poly(scale(table, s)));
    });
  }
  return fills.join('') + `<path d="${edges.join('')}" fill="none" ${edgeStyle(stone)} stroke-linejoin="round"/>`;
}

// SVG markup for one stone's facets, in its own 0..w x 0..h space.
export function gemBody(cutId, stoneId) {
  const cut = cutById(cutId);
  const stone = stoneById(stoneId);
  const o = outlineOf(cut.id);
  const seed = cut.id.length * 13 + stone.id.length * 5;
  const ctx = context(cut.id, stone);
  let body;
  if (cut.id === 'emerald') body = stepCut(o, ctx, seed, [1, 0.9, 0.8, 0.7], false);
  else if (cut.id === 'princess') body = stepCut(o, ctx, seed, [1, 0.86, 0.72], true);
  else body = brilliant(o, ctx, seed);
  const id = ctx.prefix;
  // Depth: the stone darkens toward its girdle and brightens toward the light.
  ctx.defs.push(
    `<clipPath id="${id}-clip"><path d="${poly(o.pts)}"/></clipPath>`,
    `<radialGradient id="${id}-depth" cx="0.42" cy="0.4" r="0.66"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${stone.id === 'diamond' ? 0.38 : 0.5}"/></radialGradient>`,
    `<radialGradient id="${id}-lift" cx="0.32" cy="0.28" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="${stone.id === 'diamond' ? 0.22 : 0.16}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${id}-spark"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
  // A few pinpoint glints where facets meet, the way stones sparkle in light.
  const P = mapper(o);
  const sparks = [
    [-2.2, 0.56, 5.5],
    [-0.9, 0.79, 3.6],
    [0.55, 0.3, 3],
  ]
    .map(([a, f, r]) => {
      const [x, y] = P(a, f);
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r * (stone.id === 'diamond' ? 1 : 0.7)}" fill="url(#${id}-spark)"/>`;
    })
    .join('');
  const overlay = `<g clip-path="url(#${id}-clip)"><rect x="0" y="0" width="${o.w}" height="${o.h}" fill="url(#${id}-depth)"/><rect x="0" y="0" width="${o.w}" height="${o.h}" fill="url(#${id}-lift)"/></g>`;
  const girdle = `<path d="${poly(o.pts)}" fill="none" stroke="${stone.ramp[0]}" stroke-opacity="0.55" stroke-width="0.5" stroke-linejoin="round"/>`;
  return { w: o.w, h: o.h, markup: `<defs>${ctx.defs.join('')}</defs><g clip-path="url(#${id}-clip)">${body}</g>${overlay}${girdle}${sparks}` };
}

const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

export function gemSvg(cutId, stoneId) {
  // Cropped exactly to the stone's outline, so its box is its size.
  const { w, h, markup } = gemBody(cutId, stoneId);
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${markup}</svg>`,
  );
}

// Width and height in mm of a stone whose length is `mm`.
export function gemSizeMm(cutId, mm) {
  return { width: mm * cutById(cutId).aspect, height: mm };
}

// --- pavé ---------------------------------------------------------------------

// A row of small round stones with metal beads between them, optionally
// bent along an arc. `bend` is how far the middle rises, in stone widths.
export function paveSvg({ count, stoneId, beadColor, bend = 0 }) {
  const { markup } = gemBody('round', stoneId);
  const d = L; // one stone, in drawing units
  const gap = d * 0.14;
  const span = count * d + (count - 1) * gap;
  const sag = bend * d;
  // Positive bend lifts the middle of the row, negative drops it.
  const lift = (t) => sag * (1 - Math.pow(2 * t - 1, 2));
  const top = Math.max(0, sag);
  const pos = (i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return [d / 2 + t * (span - d), top - lift(t) + d / 2];
  };
  const h = d + Math.abs(sag);
  let out = '';
  for (let i = 0; i < count; i++) {
    const [x, y] = pos(i);
    out += `<g transform="translate(${x - d / 2} ${y - d / 2})">${markup}</g>`;
  }
  // Beads sit between neighbours, above and below the row.
  for (let i = 0; i < count - 1; i++) {
    const [x1, y1] = pos(i);
    const [x2, y2] = pos(i + 1);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const ang = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
    for (const s of [-1, 1]) {
      const bx = mx + Math.cos(ang) * s * d * 0.36;
      const by = my + Math.sin(ang) * s * d * 0.36;
      out += `<circle cx="${bx}" cy="${by}" r="${d * 0.13}" fill="url(#bead)"/>`;
    }
  }
  const [light, mid, dark] = beadColor;
  const defs = `<defs><radialGradient id="bead" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="${light}"/><stop offset="0.55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>`;
  // Cropped to the stones themselves; the beads sit within the row.
  const pad = 0;
  const W = span;
  const H = h;
  return {
    src: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${-pad} ${-pad} ${W} ${H}">${defs}${out}</svg>`),
    // size relative to one stone's diameter
    widthUnits: W / d,
    heightUnits: H / d,
  };
}
