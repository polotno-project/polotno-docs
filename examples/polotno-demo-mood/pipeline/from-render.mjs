// Piece and shadow cut from the same Seedream render, so they always line up.
// Piece = render pixels inside a BiRefNet mask. Shadow = render ÷ empty room
// outside that mask, as black with alpha (darkens whatever floor is below).
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import os from 'node:os';
const PUB = '/Users/mikhailzhuro/Documents/GitHub/polotno-website/.claude/worktrees/real-estate-seedream/examples/polotno-demo-room-visualizer-photoreal/public/scene';
const [, , DIR, OUT, id, X, Y, W, H] = process.argv;
const [x, y, w, h] = [X, Y, W, H].map(Number);
const WD = +(process.env.W || 2496), HT = +(process.env.H || 1664);
const token = fs.readFileSync(os.homedir() + '/.config/polotno-remix/token', 'utf8').trim();
const api = async (path, body) => {
  const res = await fetch(`https://api.replicate.com/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: body && JSON.stringify(body) });
  return res.json();
};

// 1. Mask of the piece in the render, from a crop around its box.
const m = 60;
const cx = Math.max(0, x - m), cy = Math.max(0, y - m);
const cw = Math.min(WD, x + w + m) - cx, ch = Math.min(HT, y + h + m) - cy;
let render = await sharp(`${DIR}/${id}-render.png`).resize(WD, HT, { fit: 'fill' }).removeAlpha().png().toBuffer();
// Each Nano Banana pass drifts the colour a little. Match the render to the
// empty room, channel by channel, using everything outside the piece's area,
// so the piece keeps the room's own tones.
if (process.env.ROOM_IMG) {
  const room = await sharp(process.env.ROOM_IMG).resize(WD, HT, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const raw = await sharp(render).raw().toBuffer();
  const pad = 0.6;
  const inside = (px, py) => px > x - w * pad && px < x + w * (1 + pad) && py > y - h * pad && py < y + h * (1 + pad);
  const ratios = [[], [], []];
  for (let py = 0; py < HT; py += 6) for (let px = 0; px < WD; px += 6) {
    if (inside(px, py)) continue;
    const q = (py * WD + px) * 3;
    for (let c = 0; c < 3; c++) if (room[q + c] > 20 && room[q + c] < 245) ratios[c].push(room[q + c] / Math.max(1, raw[q + c]));
  }
  const gains = ratios.map((r) => { r.sort((a, b) => a - b); return r.length ? r[r.length >> 1] : 1; });
  for (let q = 0; q < raw.length; q += 3) for (let c = 0; c < 3; c++) raw[q + c] = Math.min(255, Math.round(raw[q + c] * gains[c]));
  render = await sharp(raw, { raw: { width: WD, height: HT, channels: 3 } }).png().toBuffer();
  console.error('colour gains', gains.map((g) => g.toFixed(3)).join(' '));
}
const crop = await sharp(render).extract({ left: cx, top: cy, width: cw, height: ch }).png().toBuffer();
let p = await api('models/men1scus/birefnet/predictions', { input: { image: 'data:image/png;base64,' + crop.toString('base64') } });
if (p.version === undefined && p.detail) p = await api('predictions', { version: 'f74986db0355b58403ed20963af156525e2891ea3c2d499bfbfb2a28cd87c5d7', input: { image: 'data:image/png;base64,' + crop.toString('base64') } });
while (!['succeeded', 'failed', 'canceled'].includes(p.status)) { await new Promise((r) => setTimeout(r, 2000)); p = await api(`predictions/${p.id}`); }
if (p.status !== 'succeeded') throw new Error(id + ' ' + p.error);
const maskBuf = Buffer.from(await (await fetch(Array.isArray(p.output) ? p.output[0] : p.output)).arrayBuffer());
const meta = await sharp(maskBuf).metadata();
let maskCrop = meta.hasAlpha
  ? await sharp(maskBuf).resize(cw, ch, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer()
  : await sharp(maskBuf).resize(cw, ch, { fit: 'fill' }).greyscale().raw().toBuffer();
// A second background remover: keep a pixel if either model keeps it, so a
// part one of them misses (a dark table top on dark parquet, velvet in shadow)
// still comes through. Neither model picks up floor shadows.
if (process.env.SEG2) {
  let q2 = await api('predictions', { version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc', input: { image: 'data:image/png;base64,' + crop.toString('base64') } });
  while (!['succeeded', 'failed', 'canceled'].includes(q2.status)) { await new Promise((r) => setTimeout(r, 2000)); q2 = await api(`predictions/${q2.id}`); }
  if (q2.status === 'succeeded') {
    const buf2 = Buffer.from(await (await fetch(Array.isArray(q2.output) ? q2.output[0] : q2.output)).arrayBuffer());
    const m2 = await sharp(buf2).resize(cw, ch, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer();
    const merged = Buffer.alloc(cw * ch);
    for (let k = 0; k < merged.length; k++) merged[k] = Math.max(maskCrop[k], m2[k]);
    maskCrop = merged;
  } else console.error('seg2 failed', q2.error);
}
// Rugs: a flat four-sided shape. Take the area that clearly changed, and use
// the convex outline around it, so the rug is solid edge to edge even where
// its colours are close to the parquet.
if (process.env.MASK === 'hull') {
  const sm = async (buf) => sharp(buf).extract({ left: cx, top: cy, width: cw, height: ch }).blur(4).removeAlpha().raw().toBuffer();
  const r = await sm(render);
  const e = await sm(await sharp(process.env.ROOM_IMG).resize(WD, HT, { fit: 'fill' }).png().toBuffer());
  const pts = [];
  for (let j = 0; j < ch; j += 2) for (let i = 0; i < cw; i += 2) {
    const q = j * cw + i;
    const d = Math.abs(r[q * 3] - e[q * 3]) + Math.abs(r[q * 3 + 1] - e[q * 3 + 1]) + Math.abs(r[q * 3 + 2] - e[q * 3 + 2]);
    // 'hull' on the background remover's own mask (default), or on the
    // render-vs-room difference when that mask is missing.
    let hit;
    if (process.env.HULL_FROM === 'carpet') {
      // A carpet against pale wallpaper: saturated or dark pixels.
      const R = r[q * 3], G = r[q * 3 + 1], B = r[q * 3 + 2];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      hit = ((mx - mn) / Math.max(1, mx) > 0.38 || mx < 95) && d > 90;
    } else hit = process.env.HULL_FROM === 'diff' ? d > 110 : maskCrop[q] > 128;
    if (hit) pts.push([i, j]);
  }
  // Carpet: keep only the largest connected patch of hits (drops the portrait
  // frame, the side table and stray warm wallpaper).
  if (process.env.HULL_FROM === 'carpet' && pts.length) {
    const gw = Math.ceil(cw / 2), gh = Math.ceil(ch / 2);
    const grid = new Uint8Array(gw * gh);
    for (const [i, j] of pts) grid[(j >> 1) * gw + (i >> 1)] = 1;
    // Close small gaps (pattern's pale bits) with a 3-cell neighbourhood vote.
    const g2 = new Uint8Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      let n = 0;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < gw && b < gh) n += grid[b * gw + a]; }
      g2[j * gw + i] = n >= 25 ? 1 : 0;
    }
    const lab = new Int32Array(gw * gh).fill(-1), sizes = [];
    for (let s0 = 0; s0 < gw * gh; s0++) {
      if (lab[s0] !== -1 || !g2[s0]) continue;
      const id = sizes.length; let n = 0; const st = [s0]; lab[s0] = id;
      while (st.length) { const q = st.pop(); n++; const qi = q % gw, qj = (q / gw) | 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = qi + di, b = qj + dj; if (a < 0 || b < 0 || a >= gw || b >= gh) continue; const t = b * gw + a; if (lab[t] === -1 && g2[t]) { lab[t] = id; st.push(t); } } }
      sizes.push(n);
    }
    const big = sizes.indexOf(Math.max(...sizes));
    pts.length = 0;
    for (let k = 0; k < gw * gh; k++) if (lab[k] === big) pts.push([(k % gw) * 2, ((k / gw) | 0) * 2]);
  }
  // Monotone chain convex hull.
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  let hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  // Carpet: four straight sides. Keep the hull's four longest edges as lines
  // and intersect neighbours, so a corner the colour test clipped comes back.
  if (process.env.HULL_FROM === 'carpet' && hull.length > 4) {
    const edges = hull.map((p, k) => { const q = hull[(k + 1) % hull.length]; return { p, q, len: Math.hypot(q[0] - p[0], q[1] - p[1]), k }; });
    const four = [...edges].sort((a, b) => b.len - a.len).slice(0, 4).sort((a, b) => a.k - b.k);
    const meet = (e1, e2) => {
      const [x1, y1] = e1.p, [x2, y2] = e1.q, [x3, y3] = e2.p, [x4, y4] = e2.q;
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-6) return e1.q;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
      return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
    };
    hull = four.map((e, k) => meet(four[(k + 3) % 4], e)).map(([a, b]) => [Math.max(0, Math.min(cw, a)), Math.max(0, Math.min(ch, b))]);
  }
  const svg = `<svg width="${cw}" height="${ch}"><polygon points="${hull.map((p) => p.join(',')).join(' ')}" fill="white"/></svg>`;
  maskCrop = await sharp({ create: { width: cw, height: ch, channels: 3, background: '#000' } }).composite([{ input: Buffer.from(svg) }]).blur(1.5).extractChannel(0).raw().toBuffer();
}
// Curtains and other things the background remover can't separate from a
// window: the mask is wherever the render differs clearly from the empty room.
if (process.env.MASK === 'diff') {
  const sm = async (buf) => sharp(buf).extract({ left: cx, top: cy, width: cw, height: ch }).blur(2).removeAlpha().raw().toBuffer();
  const r = await sm(render);
  const e = await sm(await sharp(process.env.ROOM_IMG).resize(WD, HT, { fit: 'fill' }).png().toBuffer());
  const m = Buffer.alloc(cw * ch);
  for (let q = 0; q < cw * ch; q++) {
    const d = Math.abs(r[q * 3] - e[q * 3]) + Math.abs(r[q * 3 + 1] - e[q * 3 + 1]) + Math.abs(r[q * 3 + 2] - e[q * 3 + 2]);
    m[q] = Math.max(0, Math.min(255, ((d - 50) / 70) * 255));
  }
  // Close small holes and drop specks.
  maskCrop = await sharp(m, { raw: { width: cw, height: ch, channels: 1 } }).blur(3).linear(1.6, -60).extractChannel(0).raw().toBuffer();
}
fs.writeFileSync(`${OUT}/${id}-mask.png`, await sharp(maskCrop, { raw: { width: cw, height: ch, channels: 1 } }).png().toBuffer());

// 2. Piece: render pixels with that mask, trimmed to its bounds. The mask is
// pulled in 2px, and the edge pixels take their colour from the solid piece
// next to them instead of the wall or floor behind, so no light rim shows.
const erode = (src, w2, h2, r) => {
  const pass = (a, horizontal) => {
    const out = Buffer.alloc(a.length);
    for (let j = 0; j < h2; j++) for (let i = 0; i < w2; i++) {
      let m = 255;
      for (let k = -r; k <= r && m; k++) {
        const ii = horizontal ? i + k : i, jj = horizontal ? j : j + k;
        // Past the crop, repeat the edge pixel: a piece cut off by the photo's
        // frame must stay solid right up to the frame.
        const v = a[Math.min(h2 - 1, Math.max(0, jj)) * w2 + Math.min(w2 - 1, Math.max(0, ii))];
        if (v < m) m = v;
      }
      out[j * w2 + i] = m;
    }
    return out;
  };
  return pass(pass(src, true), false);
};
const mask = erode(maskCrop, cw, ch, 2);
let bx0 = cw, by0 = ch, bx1 = 0, by1 = 0;
for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) if (mask[j * cw + i] > 20) { bx0 = Math.min(bx0, i); bx1 = Math.max(bx1, i); by0 = Math.min(by0, j); by1 = Math.max(by1, j); }
const pw = bx1 - bx0 + 1, ph = by1 - by0 + 1;
const rgb = await sharp(crop).extract({ left: bx0, top: by0, width: pw, height: ph }).raw().toBuffer();
const solid = new Uint8Array(pw * ph);
for (let k = 0; k < pw * ph; k++) solid[k] = maskCrop[(by0 + ((k / pw) | 0)) * cw + bx0 + (k % pw)] > 250 ? 1 : 0;
// Grow the solid piece colour outwards over the edge pixels, a pixel per pass.
for (let pass = 0; pass < 8; pass++) {
  const next = solid.slice();
  for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
    const k = j * pw + i;
    if (solid[k]) continue;
    let r = 0, g = 0, b = 0, n = 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= pw || jj >= ph) continue;
      const q = jj * pw + ii;
      if (!solid[q]) continue;
      r += rgb[q * 3]; g += rgb[q * 3 + 1]; b += rgb[q * 3 + 2]; n++;
    }
    if (n) { rgb[k * 3] = r / n; rgb[k * 3 + 1] = g / n; rgb[k * 3 + 2] = b / n; next[k] = 1; }
  }
  solid.set(next);
}
const rgba = Buffer.alloc(pw * ph * 4);
for (let k = 0; k < pw * ph; k++) {
  const j = (k / pw) | 0, i = k % pw;
  rgba[k * 4] = rgb[k * 3]; rgba[k * 4 + 1] = rgb[k * 3 + 1]; rgba[k * 4 + 2] = rgb[k * 3 + 2];
  rgba[k * 4 + 3] = mask[(by0 + j) * cw + bx0 + i];
}
await sharp(rgba, { raw: { width: pw, height: ph, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/${id}.webp`);
let pieceBox = { x: cx + bx0, y: cy + by0, width: pw, height: ph };
// Thin, fine pieces (plants) lose detail in the mask, so they keep their
// original cut-out and only the shadow comes from the render.
const ORIGINAL = process.env.ORIGINAL;
let origAlpha = null;
if (ORIGINAL) {
  fs.copyFileSync(`${ORIGINAL}/${id}.webp`, `${OUT}/${id}.webp`);
  pieceBox = { x, y, width: w, height: h };
  origAlpha = await sharp(`${ORIGINAL}/${id}.webp`).resize(w, h, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer();
}

// 3. Shadow: render ÷ empty room, outside the piece; the piece area is filled
// smoothly from around it so the shadow runs on underneath.
const lum = async (buf) => {
  const { data } = await sharp(buf).resize(WD, HT, { fit: 'fill' }).removeAlpha().blur(+(process.env.SHADOW_BLUR || 0.3)).raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(WD * HT);
  // Measured in display values: the canvas draws the shadow in that space.
  const lin = (v) => v / 255;
  for (let i = 0, q = 0; q < out.length; q++, i += 3) out[q] = 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]) + 1e-4;
  return out;
};
const R = await lum(render);
const E = await lum(process.env.ROOM_IMG || `${PUB}/room.webp`);
// The piece and its soft 3px edge are ignored and filled from the shadow just
// outside them.
let hole = new Uint8Array(WD * HT);
for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) if (maskCrop[j * cw + i] > 4) hole[(cy + j) * WD + cx + i] = 1;
if (origAlpha) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (origAlpha[j * w + i] > 4) hole[(y + j) * WD + x + i] = 1;
const BAND = 3;
const dilate = (src, horizontal) => {
  const out = new Uint8Array(src.length);
  for (let a = 0; a < (horizontal ? HT : WD); a++) {
    let last = -1e9;
    const n = horizontal ? WD : HT;
    const at = (b) => (horizontal ? a * WD + b : b * WD + a);
    for (let b = 0; b < n; b++) { if (src[at(b)]) last = b; if (b - last <= BAND) out[at(b)] = 1; }
    last = 1e9;
    for (let b = n - 1; b >= 0; b--) { if (src[at(b)]) last = b; if (last - b <= BAND) out[at(b)] = 1; }
  }
  return out;
};
hole = dilate(dilate(hole, true), false);
// TIGHT keeps the search close to the piece, so redrawn room detail further
// away (door frames, curtains) can't read as shadow.
const SPREAD = process.env.TIGHT ? 0.2 : 0.5;
const rx0 = Math.max(0, x - w * SPREAD), rx1 = Math.min(WD, x + w * (1 + SPREAD)), ry0 = process.env.ROI_TOP ? y : Math.max(0, y - h * 0.4), ry1 = Math.min(HT, y + h * (process.env.TIGHT ? 1.25 : 1.6));
const inRoi = (px, py) => px >= rx0 && px < rx1 && py >= ry0 && py < ry1;
const far = [];
const RING = 90;
for (let py = 0; py < HT; py += 3) for (let px = 0; px < WD; px += 3) {
  if (inRoi(px, py)) continue;
  const d = Math.max(rx0 - px, px - rx1, ry0 - py, py - ry1);
  if (d < RING) far.push(R[py * WD + px] / E[py * WD + px]);
}
if (!far.length) far.push(1);
far.sort((a, b) => a - b);
const gain = far[far.length >> 1];
const vals = new Float32Array(WD * HT);
for (let py = 0; py < HT; py++) for (let px = 0; px < WD; px++) {
  const q = py * WD + px;
  if (hole[q] || !inRoi(px, py)) continue;
  const edge = Math.min(px - rx0, rx1 - px, py - ry0, ry1 - py) / 180;
  let a = 1 - Math.min(1, R[q] / E[q] / gain);
  vals[q] = Math.max(0, (a - 0.04) / 0.96) * (Math.min(1, edge) ** 2) * 255;
}
const holes = [];
for (let q = 0; q < hole.length; q++) if (hole[q]) holes.push(q);
const known = new Uint8Array(WD * HT);
for (let q = 0; q < known.length; q++) known[q] = hole[q] ? 0 : 1;
let open = holes;
for (let pass = 0; pass < 60 && open.length; pass++) {
  const filled = [];
  const rest = [];
  for (const q of open) {
    const px = q % WD, py = (q / WD) | 0;
    let sum = 0, n = 0;
    for (const d of [-1, 1, -WD, WD, -WD - 1, -WD + 1, WD - 1, WD + 1]) {
      const r = q + d;
      const rx = r % WD;
      if (r < 0 || r >= known.length || Math.abs(rx - px) > 1 || !known[r]) continue;
      sum += vals[r]; n++;
    }
    if (n) filled.push([q, sum / n]); else rest.push(q);
  }
  for (const [q, v] of filled) { vals[q] = v; known[q] = 1; }
  open = rest;
}
// FLOOR: a floor piece only shadows the floor around its feet. Keep the
// shadow inside a soft zone around the lower part of the piece, so redrawn
// room detail (door frames, curtains, walls) can never read as shadow.
if (process.env.FLOOR) {
  const zx0 = x - w * 0.12, zx1 = x + w * 1.12, zy0 = y + h * 0.55, zy1 = Math.min(HT, y + h * 1.15);
  const feather = Math.max(30, w * 0.08);
  for (let py = 0; py < HT; py++) for (let px = 0; px < WD; px++) {
    const q = py * WD + px;
    if (!vals[q]) continue;
    const d = Math.min(px - zx0, zx1 - px, py - zy0, zy1 - py);
    const k = d <= 0 ? 0 : Math.min(1, d / feather);
    vals[q] *= k * k * (3 - 2 * k);
  }
}
const full = Buffer.alloc(WD * HT);
for (let q = 0; q < full.length; q++) full[q] = Math.min(175, Math.round(vals[q]));
const blurred = await sharp(full, { raw: { width: WD, height: HT, channels: 1 } }).blur(2.5).extractChannel(0).raw().toBuffer();
let minX = WD, minY = HT, maxX = 0, maxY = 0;
for (let py = 0; py < HT; py++) for (let px = 0; px < WD; px++) if (blurred[py * WD + px] > 0) { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
const sw = maxX - minX + 1, sh = maxY - minY + 1;
if (process.env.DEBUG) console.log(blurred.length, WD * HT, minX, maxX, minY, maxY);
const sh4 = Buffer.alloc(sw * sh * 4);
for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) sh4[(j * sw + i) * 4 + 3] = blurred[(minY + j) * WD + minX + i];
await sharp(sh4, { raw: { width: sw, height: sh, channels: 4 } }).webp({ lossless: true }).toFile(`${OUT}/${id}-shadow.webp`);
console.log(JSON.stringify({ id, piece: pieceBox, shadow: { x: minX, y: minY, width: sw, height: sh }, gain: +gain.toFixed(3) }));
