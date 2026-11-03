// A new model (style) for a slot, end to end.
//
// The slot's first style is shown in the room, a crop around it goes to Nano
// Banana with "replace it with <description>", and the new piece is cut out
// of the render (two background removers, kept near where the old piece
// stood so nothing else in the room comes along). Then its AI zone shadow is
// made (zone-shadow.mjs), carried past the photo's edge where it reaches it,
// and the style is added to soviet.json. A wall unit is part of the room
// photo, so its render replaces the old unit in a copy of the photo instead.
// `colour` marks a fully upholstered piece: its whole outline takes a colour.
// Relight (relight.mjs) and window-view.mjs afterwards.
//   node new-model.mjs <example dir> <work dir> <slot> <id> "<description>" [colour]
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { render, segment } from './ai.mjs';

const [, , P, WORK, slotId, id, description, colour] = process.argv;
const pub = `${P}/public`;
const sceneFile = `${P}/src/soviet.json`;
const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
const W = scene.width, H = scene.height;
fs.mkdirSync(WORK, { recursive: true });
// Several models are made at once: soviet.json is read fresh for each change.
const update = (fn) => {
  const s = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  fn(s);
  fs.writeFileSync(sceneFile, JSON.stringify(s, null, 1) + '\n');
};

const NOUN = {
  'wall-unit': 'tall wall unit along the right wall',
  'wall-carpet': 'carpet hanging on the left wall',
  rug: 'carpet lying on the floor',
  tv: 'TV standing on its low TV cabinet',
  lamp: 'floor lamp',
  sofa: 'sofa',
  table: 'coffee table',
  armchair: 'armchair',
};
const noun = NOUN[slotId];
const unit = slotId === 'wall-unit';
const empty = await sharp(`${pub}/${scene.src}`).removeAlpha().raw().toBuffer();

// The room with the slot's first style in it, and that style's outline.
let room, outline;
if (unit) {
  room = await sharp(`${pub}/${scene.wallUnit.items[0].src}`).removeAlpha().raw().toBuffer();
  const diff = Buffer.alloc(W * H);
  for (let k = 0; k < W * H; k++) diff[k] = Math.max(Math.abs(room[k * 3] - empty[k * 3]), Math.abs(room[k * 3 + 1] - empty[k * 3 + 1]), Math.abs(room[k * 3 + 2] - empty[k * 3 + 2])) > 18 ? 255 : 0;
  outline = await sharp(diff, { raw: { width: W, height: H, channels: 1 } }).blur(6).extractChannel(0).raw().toBuffer();
  for (let k = 0; k < W * H; k++) outline[k] = Math.min(255, outline[k] * 2);
} else {
  const ref = scene.slots.find((s) => s.id === slotId).items[0];
  const b = ref.box;
  const piece = await sharp(`${pub}/soviet/${ref.id}.webp`).resize(b.width, b.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
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

// Crop: the old piece plus a margin, room for a new shape.
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let k = 0; k < W * H; k++) if (outline[k] > 128) { const x = k % W, y = (k / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
const size = Math.max(x1 - x0, y1 - y0);
const pad = Math.round(size * (unit ? 0.08 : 0.25));
const C = { left: Math.max(0, x0 - pad), top: Math.max(0, y0 - pad) };
C.width = Math.min(W, x1 + pad) - C.left;
C.height = Math.min(H, y1 + pad) - C.top;
const crop = await sharp(room, { raw: { width: W, height: H, channels: 3 } }).extract(C).png().toBuffer();
const src = await sharp(crop).raw().toBuffer();

const raw = `${WORK}/${id}.png`;
if (!fs.existsSync(raw)) {
  // A new render means a new piece: its old shadow render no longer fits.
  fs.rmSync(`${WORK}/zone-${id}-render.png`, { force: true });
  fs.writeFileSync(raw, await render(
    `Replace the ${noun} in this photo with a different one: ${description}. It stands in the same spot, at the same size and from the same camera angle, in the same perspective as the old one, ${unit || slotId === 'wall-carpet' ? 'against the same wall' : 'standing on the same floor'}. It is a real piece of Soviet furniture from the 1970s–80s, photographed in this room: lit by the same soft daylight from the window, with the same colour, contrast and film grain as the rest of the photo; matte fabrics and real wood grain, nothing glossy, waxy or plastic. Do not change anything else in the room and do not add anything.`,
    crop,
  ));
}

// The render, colour-matched to the crop outside the old piece.
const res = await sharp(raw).resize(C.width, C.height, { fit: 'fill' }).removeAlpha().raw().toBuffer();
const sum = [0, 0, 0, 0, 0, 0];
for (let j = 0; j < C.height; j += 2) for (let i = 0; i < C.width; i += 2) {
  const k = (C.top + j) * W + C.left + i, n = j * C.width + i;
  if (outline[k] > 4) continue;
  for (let c = 0; c < 3; c++) { sum[c] += src[n * 3 + c]; sum[c + 3] += res[n * 3 + c]; }
}
const gain = [0, 1, 2].map((c) => (sum[c + 3] ? sum[c] / sum[c + 3] : 1));
const matched = Buffer.alloc(C.width * C.height * 3);
for (let n = 0; n < C.width * C.height; n++) for (let c = 0; c < 3; c++) matched[n * 3 + c] = Math.min(255, Math.round(res[n * 3 + c] * gain[c]));

if (unit) {
  // As in materials.mjs: the render replaces the old unit and its own new
  // outline together, feathered just outside, never past the crop.
  const nearUnit = await sharp(outline, { raw: { width: W, height: H, channels: 1 } }).blur(60).extractChannel(0).raw().toBuffer();
  const area = Buffer.alloc(W * H);
  for (let j = 0; j < C.height; j++) for (let i = 0; i < C.width; i++) {
    const k = (C.top + j) * W + C.left + i, n = j * C.width + i;
    const d = Math.max(Math.abs(matched[n * 3] - empty[k * 3]), Math.abs(matched[n * 3 + 1] - empty[k * 3 + 1]), Math.abs(matched[n * 3 + 2] - empty[k * 3 + 2]));
    // TIGHT=1: only the old unit's own outline. For a render that redrew
    // the room around the unit (a ceiling corner, another curtain).
    area[k] = outline[k] > 20 || (!process.env.TIGHT && d > 30 && nearUnit[k] > 10) ? 255 : 0;
  }
  let a = await sharp(area, { raw: { width: W, height: H, channels: 1 } }).blur(24).extractChannel(0).raw().toBuffer();
  for (let k = 0; k < W * H; k++) a[k] = a[k] > 40 ? 255 : 0;
  a = await sharp(a, { raw: { width: W, height: H, channels: 1 } }).blur(5).extractChannel(0).raw().toBuffer();
  const seam = (v, lo, hi, max) => (lo > 0 && v < lo + 8) || (hi < max && v >= hi - 8);
  for (let k = 0; k < W * H; k++) {
    const x = k % W, y = (k / W) | 0;
    if (x < C.left || y < C.top || x >= C.left + C.width || y >= C.top + C.height || seam(x, C.left, C.left + C.width, W) || seam(y, C.top, C.top + C.height, H)) a[k] = 0;
  }
  const out = Buffer.from(empty);
  for (let j = 0; j < C.height; j++) for (let i = 0; i < C.width; i++) {
    const k = (C.top + j) * W + C.left + i, n = j * C.width + i, t = a[k] / 255;
    if (t) for (let c = 0; c < 3; c++) out[k * 3 + c] = Math.round(empty[k * 3 + c] * (1 - t) + matched[n * 3 + c] * t);
  }
  const file = `soviet/room-${id}.webp`;
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(`${pub}/${file}`);
  await sharp(a, { raw: { width: W, height: H, channels: 1 } }).png().toFile(`${pub}/soviet/room-${id}-area.png`);
  // Thumbnail: the unit's part of the photo, the same size as the others'.
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).extract(C).resize(240, 485, { fit: 'cover' }).webp({ quality: 85 }).toFile(`${pub}/soviet/${id}-thumb.webp`);
  update((s) => { s.wallUnit.items = [...s.wallUnit.items.filter((i) => i.id !== id), { id, src: file, thumb: `soviet/${id}-thumb.webp` }]; });
  console.log(id, 'done');
  process.exit(0);
}

// Cut out: either remover's keep counts, near where the old piece stood
// (grown by GROW of its size, default 6%: the new one may be bigger, and a
// splayed tripod reaches well past a straight pole).
const [m1, m2] = await segment(matched, C.width, C.height);
const near = Buffer.alloc(C.width * C.height);
for (let j = 0; j < C.height; j++) for (let i = 0; i < C.width; i++) near[j * C.width + i] = outline[(C.top + j) * W + C.left + i] > 64 ? 255 : 0;
const grown = await sharp(near, { raw: { width: C.width, height: C.height, channels: 1 } }).blur(Math.max(8, size * +(process.env.GROW || 0.06))).extractChannel(0).raw().toBuffer();
const alpha = Buffer.alloc(C.width * C.height);
let bx0 = C.width, by0 = C.height, bx1 = -1, by1 = -1;
for (let n = 0; n < alpha.length; n++) {
  alpha[n] = grown[n] > 4 ? Math.max(m1[n], m2[n]) : 0;
  if (alpha[n] > 20) { const x = n % C.width, y = (n / C.width) | 0; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
}
const pw = bx1 - bx0 + 1, ph = by1 - by0 + 1;
const rgba = Buffer.alloc(pw * ph * 4);
const mask = Buffer.alloc(pw * ph);
for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
  const n = (by0 + j) * C.width + bx0 + i, o = j * pw + i;
  for (let c = 0; c < 3; c++) rgba[o * 4 + c] = matched[n * 3 + c];
  rgba[o * 4 + 3] = mask[o] = alpha[n];
}
await sharp(rgba, { raw: { width: pw, height: ph, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${pub}/soviet/${id}.webp`);
if (colour) await sharp(mask, { raw: { width: pw, height: ph, channels: 1 } }).toColourspace('srgb').png().toFile(`${pub}/soviet/${id}-mask.png`);

const box = { x: C.left + bx0, y: C.top + by0, width: pw, height: ph };
update((s) => {
  const slot = s.slots.find((x) => x.id === slotId);
  slot.items = [...slot.items.filter((i) => i.id !== id), { id, box, shadow: null, ...(colour ? { colour: true } : {}) }];
});

// Shadow (the wall carpet has none, see FLAT in scene.js).
if (slotId !== 'wall-carpet') {
  const line = execFileSync('node', [new URL('./zone-shadow.mjs', import.meta.url).pathname, P, id, noun, 'new'], {
    env: { ...process.env, W: String(W), H: String(H), RES: '4K', WORK, ...(slotId === 'rug' ? { FLAT: '1' } : {}) },
    maxBuffer: 1e8,
  }).toString().trim().split('\n').pop();
  let sb = JSON.parse(line).shadow;
  const f = `${pub}/soviet/${id}-shadow.webp`;
  fs.renameSync(`${pub}/soviet/${id}-new-shadow.webp`, f);
  // Past the photo's edge, as extend-shadows.mjs does.
  const EXT = 300, left = sb.x <= 0 ? EXT : 0, right = sb.x + sb.width >= W ? EXT : 0, bottom = sb.y + sb.height >= H ? EXT : 0;
  if (left || right || bottom) {
    await sharp(await sharp(f).extend({ left, right, bottom, extendWith: 'copy' }).webp({ lossless: true }).toBuffer()).toFile(f);
    sb = { x: sb.x - left, y: sb.y, width: sb.width + left + right, height: sb.height + bottom };
  }
  update((s) => { s.slots.find((x) => x.id === slotId).items.find((i) => i.id === id).shadow = sb; });
}
console.log(id, 'done', JSON.stringify(box));
