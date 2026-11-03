// Zone shadows: the exact cut piece is pasted into the empty room, Nano Banana
// adds only its shadows, and the darkening is taken only inside a zone around
// the piece (its outline grown evenly by 30% of its size). Nothing outside the
// zone can end up in the shadow, and the piece itself is never redrawn.
//   [FLAT=1] [WORK=<dir>] node zone-shadow.mjs <example dir> <id> <noun> <out suffix>
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import { nb } from './nb.mjs';

const [, , P, id, noun, suffix = 's2'] = process.argv;
// Working files go to $WORK (default: next to this script).
const D = process.env.WORK || new URL('.', import.meta.url).pathname;
const scene = JSON.parse(fs.readFileSync(`${P}/src/soviet.json`, 'utf8'));
const item = scene.slots.flatMap((s) => s.items).find((i) => i.id === id);
const W = scene.width, H = scene.height, box = item.box;

const empty = await sharp(`${P}/public/soviet/room.webp`).removeAlpha().raw().toBuffer();
const piece = await sharp(`${P}/public/soviet/${id}.webp`).resize(box.width, box.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
const alpha = Buffer.alloc(W * H);
const comp = Buffer.from(empty);
for (let j = 0; j < box.height; j++) for (let i = 0; i < box.width; i++) {
  const X = box.x + i, Y = box.y + j;
  if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
  const p = (j * box.width + i) * 4, a = piece[p + 3] / 255, k = Y * W + X;
  alpha[k] = piece[p + 3];
  for (let c = 0; c < 3; c++) comp[k * 3 + c] = Math.round(empty[k * 3 + c] * (1 - a) + piece[p + c] * a);
}
const compFile = `${D}/zone-${id}-in.png`;
await sharp(comp, { raw: { width: W, height: H, channels: 3 } }).png().toFile(compFile);

const out = `${D}/zone-${id}-render.png`;
if (!fs.existsSync(out)) {
  await nb(
    `This photo of a room has a ${noun} in it, but the ${noun} casts no shadow and looks pasted in. Add only the ${noun}'s natural, realistic shadows from the room's own light: the soft dark contact shadow where it touches the floor and the soft shade it casts around it. Do not move, resize, redraw or change the ${noun} in any way. Do not change anything else in the room. Exactly the same camera, framing, colours and grain.`,
    [compFile], out,
  );
}
const res = await sharp(out).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();

// Zone: the outline grown evenly by 30% of the piece's size, softened.
const r = Math.round(Math.max(box.width, box.height) * 0.3);
const grownRaw = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(r / 2.5).extractChannel(0).raw().toBuffer();
const zone = new Float32Array(W * H);
for (let k = 0; k < W * H; k++) zone[k] = Math.min(1, Math.max(0, (grownRaw[k] - 2) / 10));

// Match the render's colours to the room just outside the zone.
const sum = [0, 0, 0, 0, 0, 0];
for (let k = 0; k < W * H; k += 3) if (zone[k] === 0 && grownRaw[k] > 0) for (let c = 0; c < 3; c++) { sum[c] += comp[k * 3 + c]; sum[c + 3] += res[k * 3 + c]; }
const gain = [0, 1, 2].map((c) => (sum[c + 3] ? sum[c] / sum[c + 3] : 1));

// Shadow = how much darker the render is than the empty room, smoothed so
// redrawn floor texture doesn't count, inside the zone only.
const lum = (b, k, g = [1, 1, 1]) => 0.299 * b[k * 3] * g[0] + 0.587 * b[k * 3 + 1] * g[1] + 0.114 * b[k * 3 + 2] * g[2];
const L1 = Buffer.alloc(W * H), L0 = Buffer.alloc(W * H);
for (let k = 0; k < W * H; k++) { L1[k] = Math.min(255, lum(res, k, gain)); L0[k] = lum(empty, k); }
// Smoothed over room pixels only (normalised blur), so the piece's own dark
// colours never smear into its shadow; under the piece it fills in from the
// floor and wall around it.
const M = Buffer.alloc(W * H);
for (let k = 0; k < W * H; k++) M[k] = alpha[k] > 8 ? 0 : 255;
const blur = (b) => sharp(b, { raw: { width: W, height: H, channels: 1 } }).blur(+(process.env.SOFT || 12)).extractChannel(0).raw().toBuffer();
const masked = (L) => { const o = Buffer.alloc(W * H); for (let k = 0; k < W * H; k++) o[k] = M[k] ? L[k] : 0; return o; };
const [B1, B0, BM] = await Promise.all([blur(masked(L1)), blur(masked(L0)), blur(M)]);
const sh = new Float32Array(W * H);
for (let k = 0; k < W * H; k++) {
  if (BM[k] < 8) continue;
  const d = 1 - B1[k] / Math.max(1, B0[k]);
  sh[k] = zone[k] * Math.min(0.85, Math.max(0, (d - 0.05) / 0.95));
  // A rug is drawn under the shadow layer: its shadow must not cover it.
  if (process.env.FLAT) sh[k] *= 1 - alpha[k] / 255;
}

// Crop to where there is shadow, write black + alpha.
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sh[y * W + x] > 0.01) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
const sw = x1 - x0 + 1, shh = y1 - y0 + 1;
const rgba = Buffer.alloc(sw * shh * 4);
for (let y = 0; y < shh; y++) for (let x = 0; x < sw; x++) rgba[(y * sw + x) * 4 + 3] = Math.round(sh[(y0 + y) * W + x0 + x] * 255);
await sharp(rgba, { raw: { width: sw, height: shh, channels: 4 } }).webp({ lossless: true }).toFile(`${P}/public/soviet/${id}-${suffix}-shadow.webp`);
console.log(JSON.stringify({ id, shadow: { x: x0, y: y0, width: sw, height: shh }, gain }));
