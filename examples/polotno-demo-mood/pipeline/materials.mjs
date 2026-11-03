// Materials: the same model in another fabric or finish.
//
// A crop of the room with the piece in it goes to Nano Banana with "change only
// the material", colour-matched to the crop around the piece. A piece gets its
// own cut-out of the render (renders that changed its shape are redone) and
// reuses the original's shadow. A wall unit is part of the room photo, so its
// render replaces the old unit in the photo.
// Writes <id>-<material>.webp (pieces) or room-<id>-<material>.webp plus
// -area.png (units) next to the originals, and the raw renders to <work dir>.
//   node materials.mjs <example dir> <work dir> <id> <material>[@<try>] [<material>…]
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import os from 'node:os';

export const MATERIALS = {
  sofa: {
    velour: 'plush cotton velour upholstery with a soft, short pile and a gentle sheen in the folds',
    jacquard: 'woven cotton jacquard upholstery with a small, dense, traditional Soviet floral pattern',
    tweed: 'coarse wool tweed upholstery with a visible woven, flecked texture',
    leatherette: 'brown Soviet leatherette (dermantin) upholstery, smooth with a soft satin sheen and fine creases',
    chenille: 'chenille upholstery with a soft, velvety, slightly ribbed texture',
  },
  armchair: {
    jacquard: 'woven cotton jacquard upholstery with a small, dense, traditional Soviet floral pattern',
    tweed: 'coarse wool tweed upholstery with a visible woven, flecked texture',
    leatherette: 'brown Soviet leatherette (dermantin) upholstery, smooth with a soft satin sheen and fine creases',
    chenille: 'chenille upholstery with a soft, velvety, slightly ribbed texture',
    velour: 'plush cotton velour upholstery with a soft, short pile and a gentle sheen in the folds',
  },
  'wall-unit': {
    walnut: 'high-gloss polished walnut veneer with a rich, dark figured grain',
    birch: 'light, pale birch veneer with a satin finish',
    oak: 'dark smoked oak with a matte, open-grain finish',
    mahogany: 'deep reddish mahogany with a glossy lacquer',
    white: 'white painted panels with natural wood trim around the edges and handles',
  },
};

const [, , P, WORK, id, ...mats] = process.argv;
const kind = id.replace(/-\d+$/, '');
const pub = `${P}/public`;
const scene = JSON.parse(fs.readFileSync(`${P}/src/soviet.json`, 'utf8'));
const W = scene.width, H = scene.height;
const token = fs.readFileSync(`${os.homedir()}/.config/polotno-remix/token`, 'utf8').trim();
fs.mkdirSync(WORK, { recursive: true });

async function render(prompt, png) {
  const input = { prompt, resolution: '2K', output_format: 'png', aspect_ratio: 'match_input_image', image_input: ['data:image/png;base64,' + png.toString('base64')] };
  for (let attempt = 0; attempt < 3; attempt++) {
    let p = await (await fetch('https://api.replicate.com/v1/models/google/nano-banana-pro/predictions', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: JSON.stringify({ input }) })).json();
    while (p.id && !['succeeded', 'failed', 'canceled'].includes(p.status)) {
      await new Promise((r) => setTimeout(r, 3000));
      p = await (await fetch(`https://api.replicate.com/v1/predictions/${p.id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
    }
    if (p.status === 'succeeded') return Buffer.from(await (await fetch(Array.isArray(p.output) ? p.output[0] : p.output)).arrayBuffer());
    console.error('retry', id, p.error || p.detail);
  }
  throw new Error('render failed');
}

const unit = scene.wallUnit.items.find((u) => u.id === id);
const empty = await sharp(`${pub}/${scene.src}`).removeAlpha().raw().toBuffer();

// The room with the piece in it, and the piece's outline, both full size.
let room, outline;
if (unit) {
  room = await sharp(`${pub}/${unit.src}`).removeAlpha().raw().toBuffer();
  const diff = Buffer.alloc(W * H);
  for (let k = 0; k < W * H; k++) diff[k] = Math.max(Math.abs(room[k * 3] - empty[k * 3]), Math.abs(room[k * 3 + 1] - empty[k * 3 + 1]), Math.abs(room[k * 3 + 2] - empty[k * 3 + 2])) > 18 ? 255 : 0;
  outline = await sharp(diff, { raw: { width: W, height: H, channels: 1 } }).blur(6).extractChannel(0).raw().toBuffer();
  for (let k = 0; k < W * H; k++) outline[k] = Math.min(255, outline[k] * 2);
} else {
  const item = scene.slots.flatMap((s) => s.items).find((i) => i.id === id);
  const b = item.box;
  const piece = await sharp(`${pub}/soviet/${id}.webp`).resize(b.width, b.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  room = Buffer.from(empty);
  outline = Buffer.alloc(W * H);
  for (let j = 0; j < b.height; j++) for (let i = 0; i < b.width; i++) {
    const X = b.x + i, Y = b.y + j;
    if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
    const p = (j * b.width + i) * 4, a = piece[p + 3] / 255, k = Y * W + X;
    outline[k] = piece[p + 3];
    for (let c = 0; c < 3; c++) room[k * 3 + c] = Math.round(room[k * 3 + c] * (1 - a) + piece[p + c] * a);
  }
}

// Crop: the piece's outline plus a margin.
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let k = 0; k < W * H; k++) if (outline[k] > 128) { const x = k % W, y = (k / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.08);
const C = { left: Math.max(0, x0 - pad), top: Math.max(0, y0 - pad) };
C.width = Math.min(W, x1 + pad) - C.left;
C.height = Math.min(H, y1 + pad) - C.top;
const crop = await sharp(room, { raw: { width: W, height: H, channels: 3 } }).extract(C).png().toBuffer();
const noun = unit ? 'wall unit (the tall Soviet cabinet with shelves and glass doors)' : kind;

// `fabric` is no material: the upholstery painted flat magenta, fitted like a
// material and turned into the piece's colour mask (<id>-mask.png), for
// pieces whose wooden frame must not take a colour.
const FABRIC = 'upholstery (seat, back and cushions) painted a flat, pure magenta (#FF00FF) with no texture, pattern or shading, while the wooden frame, arms and legs stay exactly as they are, in their own wood';
const prompt = (m) => `Change ONLY the material of the ${noun}: make it ${m === 'fabric' ? FABRIC : MATERIALS[kind][m]}. Keep its exact shape, size, position, outline, cushions, seams, legs, handles and perspective, pixel for pixel: the top of the backrest, the arms and the bottom edge stay exactly where they are, nothing shrinks or tilts. Keep the room, the camera and the light exactly the same, and the material lit by the same soft daylight. Photorealistic, natural film grain.`;
const src = await sharp(crop).raw().toBuffer();
const saveJson = (fn) => {
  const file = `${P}/src/materials.json`;
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  fn(all);
  fs.writeFileSync(file, JSON.stringify(all, null, 1) + '\n');
};

// A render, resized to the crop and colour-matched to the crop outside the piece.
async function load(raw) {
  const res = await sharp(raw).resize(C.width, C.height, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const sum = [0, 0, 0, 0, 0, 0];
  for (let j = 0; j < C.height; j += 2) for (let i = 0; i < C.width; i += 2) {
    const k = (C.top + j) * W + C.left + i, n = j * C.width + i;
    if (outline[k] > 4) continue;
    for (let c = 0; c < 3; c++) { sum[c] += src[n * 3 + c]; sum[c + 3] += res[n * 3 + c]; }
  }
  const gain = [0, 1, 2].map((c) => (sum[c + 3] ? sum[c] / sum[c + 3] : 1));
  const out = Buffer.alloc(C.width * C.height * 3);
  for (let n = 0; n < C.width * C.height; n++) for (let c = 0; c < 3; c++) out[n * 3 + c] = Math.min(255, Math.round(res[n * 3 + c] * gain[c]));
  return out;
}

const segment = async (matched) => {
  const png = await sharp(matched, { raw: { width: C.width, height: C.height, channels: 3 } }).png().toBuffer();
  const seg = async (body) => {
    let q = await (await fetch('https://api.replicate.com/v1/predictions', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: JSON.stringify(body) })).json();
    while (q.id && !['succeeded', 'failed', 'canceled'].includes(q.status)) { await new Promise((r) => setTimeout(r, 2000)); q = await (await fetch(`https://api.replicate.com/v1/predictions/${q.id}`, { headers: { Authorization: `Bearer ${token}` } })).json(); }
    if (q.status !== 'succeeded') throw new Error(`segmentation failed: ${q.error}`);
    const buf = Buffer.from(await (await fetch(Array.isArray(q.output) ? q.output[0] : q.output)).arrayBuffer());
    const meta = await sharp(buf).metadata();
    return meta.hasAlpha
      ? sharp(buf).resize(C.width, C.height, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer()
      : sharp(buf).resize(C.width, C.height, { fit: 'fill' }).greyscale().raw().toBuffer();
  };
  const image = 'data:image/png;base64,' + png.toString('base64');
  return Promise.all([
    seg({ version: 'f74986db0355b58403ed20963af156525e2891ea3c2d499bfbfb2a28cd87c5d7', input: { image } }),
    seg({ version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc', input: { image } }),
  ]);
};

// Pieces: the render reshapes the piece now and then (a lower backrest, a
// turn toward the corner), and then it no longer reads as the same model.
// Each render is cut out and compared with the original outline; one that
// covers less than MIN of it is redone, up to TRIES renders, best one kept,
// and that one is then fitted to the original outline.
const MIN = 0.93, TRIES = +(process.env.TRIES || 4);
let near, grown, item;
if (!unit) {
  item = scene.slots.flatMap((s) => s.items).find((i) => i.id === id);
  near = Buffer.alloc(C.width * C.height);
  for (let j = 0; j < C.height; j++) for (let i = 0; i < C.width; i++) near[j * C.width + i] = outline[(C.top + j) * W + C.left + i] > 128 ? 1 : 0;
  const n8 = Buffer.from(near.map((v) => v * 255));
  grown = await sharp(n8, { raw: { width: C.width, height: C.height, channels: 1 } }).blur(40).extractChannel(0).raw().toBuffer();
}
async function cut(matched) {
  const [m1, m2] = await segment(matched);
  const alpha = Buffer.alloc(C.width * C.height);
  let I = 0, U = 0;
  for (let n = 0; n < alpha.length; n++) {
    alpha[n] = grown[n] > 6 ? Math.max(m1[n], m2[n]) : 0;
    const a = alpha[n] > 128 ? 1 : 0;
    I += a & near[n]; U += a | near[n];
  }
  return { alpha, iou: I / U };
}

// "chenille@3" keeps render 3 of chenille, for when the closest outline
// isn't the best render (a squared-off arm stretched onto a rolled one
// looks cut).
await Promise.all(mats.map(async (arg) => {
  const [m, pin] = arg.split('@');
  if (unit) {
    const raw = `${WORK}/${id}-${m}.png`;
    if (!fs.existsSync(raw)) fs.writeFileSync(raw, await render(prompt(m), crop));
    const res = await load(raw);
    // The render redraws the unit a little differently (other doors, a
    // higher plinth), so blending it inside the old unit's outline leaves
    // bits of the old unit along the edge. It replaces the old unit and its
    // own new outline together, in full, feathered only just outside.
    // (The new outline counts only near the old one: the render redraws the
    // floor a little everywhere.)
    const nearUnit = await sharp(outline, { raw: { width: W, height: H, channels: 1 } }).blur(60).extractChannel(0).raw().toBuffer();
    const area = Buffer.alloc(W * H);
    for (let j = 0; j < C.height; j++) for (let i = 0; i < C.width; i++) {
      const k = (C.top + j) * W + C.left + i, n = j * C.width + i;
      const d = Math.max(Math.abs(res[n * 3] - empty[k * 3]), Math.abs(res[n * 3 + 1] - empty[k * 3 + 1]), Math.abs(res[n * 3 + 2] - empty[k * 3 + 2]));
      // TIGHT=1: only the old unit's own outline. For a render that redrew
      // the room around the unit (a ceiling corner, another curtain).
      area[k] = outline[k] > 20 || (!process.env.TIGHT && d > 30 && nearUnit[k] > 10) ? 255 : 0;
    }
    // Close the holes (a white door against a white wall barely differs from
    // the empty room), grow a little, then feather.
    let a = await sharp(area, { raw: { width: W, height: H, channels: 1 } }).blur(24).extractChannel(0).raw().toBuffer();
    for (let k = 0; k < W * H; k++) a[k] = a[k] > 40 ? 255 : 0;
    a = await sharp(a, { raw: { width: W, height: H, channels: 1 } }).blur(5).extractChannel(0).raw().toBuffer();
    // Never past the crop: outside it there is no render.
    // A crop side on the photo's own edge is no seam: the unit runs off the
    // frame there and must stay covered to it.
    const inside = (v, lo, hi, max) => (lo > 0 && v < lo + 8) || (hi < max && v >= hi - 8);
    for (let k = 0; k < W * H; k++) {
      const x = k % W, y = (k / W) | 0;
      if (x < C.left || y < C.top || x >= C.left + C.width || y >= C.top + C.height || inside(x, C.left, C.left + C.width, W) || inside(y, C.top, C.top + C.height, H)) a[k] = 0;
    }
    const out = Buffer.from(room);
    for (let j = 0; j < C.height; j++) for (let i = 0; i < C.width; i++) {
      const k = (C.top + j) * W + C.left + i, n = j * C.width + i, t = a[k] / 255;
      if (!t) continue;
      for (let c = 0; c < 3; c++) out[k * 3 + c] = Math.round(room[k * 3 + c] * (1 - t) + res[n * 3 + c] * t);
    }
    const name = unit.src.replace('.webp', `-${m}`);
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(`${pub}/${name}.webp`);
    // relight.mjs relights the unit inside this area.
    await sharp(a, { raw: { width: W, height: H, channels: 1 } }).png().toFile(`${pub}/${name}-area.png`);
    saveJson((all) => { all[id] = { ...(all[id] || {}), [m]: {} }; });
    console.log(id, m);
    return;
  }

  let best = null;
  for (let t = pin ? +pin : 0; t < (pin ? +pin + 1 : TRIES) && !(best && best.iou >= MIN && !pin); t++) {
    const raw = `${WORK}/${id}-${m}${t ? `-${t}` : ''}.png`;
    if (!fs.existsSync(raw)) fs.writeFileSync(raw, await render(prompt(m), crop));
    const matched = await load(raw);
    const c = await cut(matched);
    console.log(id, m, 'try', t, 'match', c.iou.toFixed(3));
    if (!best || c.iou > best.iou) best = { ...c, matched };
  }
  // Even the best render is usually a little smaller or turned (a lower
  // backrest, a shorter far arm). It's stretched back onto the original
  // outline, column by column, then row by row, so the material version has
  // exactly the original's size, angle and cut-out, and its shadow and box.
  const { alpha, matched } = best;
  const cw = C.width, ch = C.height;
  const span = (len, at) => { let a = -1, b = -1; for (let t = 0; t < len; t++) if (at(t)) { if (a < 0) a = t; b = t; } return [a, b]; };
  const target = (i, j) => outline[(C.top + j) * W + C.left + i] > 8;
  const pass = (rgb, has, vertical) => {
    const out = Buffer.alloc(cw * ch * 3), got = new Uint8Array(cw * ch);
    const lines = vertical ? cw : ch, len = vertical ? ch : cw;
    const idx = (l, t) => (vertical ? t * cw + l : l * cw + t);
    // How far each end moves, per line, as one smooth curve across the
    // piece (a least-squares parabola): a per-line fit follows the dips
    // between cushions and folds them into kinks and waves.
    const S0 = [], S1 = [], T0 = [], T1 = [];
    for (let l = 0; l < lines; l++) {
      [S0[l], S1[l]] = span(len, (t) => has[idx(l, t)]);
      [T0[l], T1[l]] = span(len, (t) => (vertical ? target(l, t) : target(t, l)));
    }
    const smooth = (d) => {
      const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], y = [0, 0, 0];
      for (let l = 0; l < lines; l++) {
        if (S0[l] < 0 || T0[l] < 0) continue;
        const x = l / lines, p = [1, x, x * x];
        for (let r = 0; r < 3; r++) { y[r] += p[r] * d[l]; for (let c = 0; c < 3; c++) M[r][c] += p[r] * p[c]; }
      }
      // Solve M·k = y (Cramer).
      const det = (A) => A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
      const D = det(M);
      const k = [0, 1, 2].map((c) => det(M.map((row, r) => row.map((v, cc) => (cc === c ? y[r] : v)))) / D);
      return d.map((_, l) => { const x = l / lines; return k[0] + k[1] * x + k[2] * x * x; });
    };
    const D0 = smooth(S0.map((v, l) => v - T0[l])), D1 = smooth(S1.map((v, l) => v - T1[l]));
    for (let l = 0; l < lines; l++) {
      const s0 = S0[l], s1 = S1[l], t0 = T0[l], t1 = T1[l];
      if (s0 < 0 || t0 < 0) continue;
      for (let t = t0; t <= t1; t++) {
        const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
        const q = Math.min(s1, Math.max(s0, t + D0[l] * (1 - f) + D1[l] * f));
        const q0 = Math.floor(q), q1 = Math.min(s1, q0 + 1), w = q - q0;
        const a = idx(l, q0) * 3, b = idx(l, q1) * 3, o = idx(l, t);
        for (let c = 0; c < 3; c++) out[o * 3 + c] = Math.round(rgb[a + c] * (1 - w) + rgb[b + c] * w);
        got[o] = 1;
      }
    }
    return [out, got];
  };
  const has = new Uint8Array(cw * ch);
  for (let n = 0; n < has.length; n++) has[n] = alpha[n] > 128 ? 1 : 0;
  const [v, vHas] = pass(matched, has, true);
  const [warped] = pass(v, vHas, false);
  // Written at the original cut-out's own size, over its own box.
  const b = item.box;
  const meta = await sharp(`${pub}/soviet/${id}.webp`).metadata();
  const rgba = Buffer.alloc(b.width * b.height * 4);
  for (let j = 0; j < b.height; j++) for (let i = 0; i < b.width; i++) {
    const X = b.x + i, Y = b.y + j, ci = X - C.left, cj = Y - C.top;
    if (X < 0 || Y < 0 || X >= W || Y >= H || ci < 0 || cj < 0 || ci >= cw || cj >= ch) continue;
    const o = (j * b.width + i) * 4, n = cj * cw + ci;
    for (let c = 0; c < 3; c++) rgba[o + c] = warped[n * 3 + c];
    rgba[o + 3] = outline[Y * W + X];
  }
  await sharp(rgba, { raw: { width: b.width, height: b.height, channels: 4 } }).resize(meta.width, meta.height, { fit: 'fill' }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${pub}/soviet/${id}-${m}.webp`);
  if (m === 'fabric') {
    // Magenta (lots of red and blue, little green) inside the outline.
    const f = `${pub}/soviet/${id}-${m}.webp`;
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const mask = Buffer.alloc(info.width * info.height);
    for (let n = 0; n < mask.length; n++) {
      const [r, g, bl, a] = [data[n * 4], data[n * 4 + 1], data[n * 4 + 2], data[n * 4 + 3]];
      mask[n] = a > 128 && r - g > 70 && bl - g > 50 ? 255 : 0;
    }
    // Close pinholes (folds and seams the render shaded darker).
    const closed = await sharp(mask, { raw: { width: info.width, height: info.height, channels: 1 } }).blur(3).extractChannel(0).raw().toBuffer();
    for (let n = 0; n < mask.length; n++) mask[n] = closed[n] > 90 ? 255 : 0;
    await sharp(mask, { raw: { width: info.width, height: info.height, channels: 1 } }).toColourspace('srgb').png().toFile(`${pub}/soviet/${id}-mask.png`);
    fs.rmSync(f);
    // Every material of the piece shares the outline, so the mask too.
    const all = fs.existsSync(`${P}/src/materials.json`) ? JSON.parse(fs.readFileSync(`${P}/src/materials.json`, 'utf8')) : {};
    for (const other of Object.keys(all[id] || {})) fs.copyFileSync(`${pub}/soviet/${id}-mask.png`, `${pub}/soviet/${id}-${other}-mask.png`);
    console.log(id, 'fabric mask');
    return;
  }
  // Same outline, so the original's colour mask fits too.
  if (fs.existsSync(`${pub}/soviet/${id}-mask.png`)) fs.copyFileSync(`${pub}/soviet/${id}-mask.png`, `${pub}/soviet/${id}-${m}-mask.png`);
  saveJson((all) => { all[id] = { ...(all[id] || {}), [m]: { box: { ...b } } }; });
  console.log(id, m, 'kept', best.iou.toFixed(3));
}));
