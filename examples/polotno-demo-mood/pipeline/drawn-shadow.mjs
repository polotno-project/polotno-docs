// Drawn shadows: made from the piece's own outline, no AI and no room photo.
// Three layers, strongest wins:
// - contact: a thin dark line along the lowest edge of the piece, where it
//   meets the floor;
// - shade: the lower part of the outline, blurred wide, the soft darkening
//   under and around the piece;
// - cast: that lower part squashed flat and pushed toward the camera (the
//   light comes from the window at the back), blurred very soft and faint.
// Flat pieces (rugs) get only a faint edge where their thickness meets the floor.
// Nothing is drawn over the piece itself, so a rug's shadow never darkens the rug.
//   node drawn-shadow.mjs <example dir> <id> [flat]
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';

const [, , P, id, kind] = process.argv;
const flat = kind === 'flat';
const scene = JSON.parse(fs.readFileSync(`${P}/src/soviet.json`, 'utf8'));
const { box } = scene.slots.flatMap((s) => s.items).find((i) => i.id === id);
const bw = box.width, bh = box.height, size = Math.max(bw, bh);
const A = await sharp(`${P}/public/soviet/${id}.webp`).resize(bw, bh, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer();

const pad = Math.round(size * 0.3);
const cw = bw + pad * 2, ch = bh + pad * 2;
const at = (i, j) => (j + pad) * cw + i + pad;
const raw = (buf) => sharp(buf, { raw: { width: cw, height: ch, channels: 1 } });
const blur = async (buf, s) => (await raw(buf).blur(Math.max(0.5, s)).extractChannel(0).raw().toBuffer());

// Lowest opaque pixel in each column: where the piece meets the floor.
const bottom = new Int32Array(bw).fill(-1);
for (let i = 0; i < bw; i++) for (let j = bh - 1; j >= 0; j--) if (A[j * bw + i] > 128) { bottom[i] = j; break; }

// The floor line: the lower hull through those points (leg tips, a base).
// Columns whose lowest pixel is well above it (a table top, a lamp shade)
// don't touch the floor.
const pts = [];
for (let i = 0; i < bw; i++) if (bottom[i] >= 0) pts.push([i, bottom[i]]);
const hull = [];
for (const q of pts) {
  while (hull.length >= 2) {
    const [a, b] = [hull[hull.length - 2], hull[hull.length - 1]];
    if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >= 0) hull.pop(); else break;
  }
  hull.push(q);
}
const floorY = new Float64Array(bw).fill(-1);
for (let h = 0; h + 1 < hull.length; h++) {
  const [a, b] = [hull[h], hull[h + 1]];
  for (let i = a[0]; i <= b[0]; i++) floorY[i] = a[1] + ((b[1] - a[1]) * (i - a[0])) / Math.max(1, b[0] - a[0]);
}
if (hull.length === 1) floorY[hull[0][0]] = hull[0][1];
const touches = (i) => bottom[i] >= 0 && floorY[i] >= 0 && floorY[i] - bottom[i] <= bh * 0.03;

if (process.env.DEBUG) { for (const f of [0.02, 0.1, 0.3, 0.5, 0.7, 0.9]) { const i = Math.round(bw * f); console.error(i, "bottom", bottom[i], "floor", Math.round(floorY[i]), "touch", touches(i)); } }
const contact = Buffer.alloc(cw * ch);
const band = Math.max(2, Math.round(bh * (flat ? 0.004 : 0.02)));
for (let i = 0; i < bw; i++) if (touches(i)) for (let j = bottom[i] - band; j <= bottom[i] + 1; j++) if (j >= 0 && j + 1 < bh + pad) contact[at(i, j + 1)] = 255;
// Rugs: their whole outline is the edge that meets the floor.
if (flat) for (let j = 1; j < bh - 1; j++) for (let i = 1; i < bw - 1; i++) {
  const k = j * bw + i;
  if (A[k] > 128 && (A[k - 1] <= 128 || A[k + 1] <= 128 || A[k - bw] <= 128 || A[k + bw] <= 128)) contact[at(i, j)] = 255;
}

const lower = Buffer.alloc(cw * ch), cast = Buffer.alloc(cw * ch);
const drop = Math.round(bh * 0.03);
for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) {
  const v = A[j * bw + i];
  if (!v || j < bh * 0.55) continue;
  lower[at(i, j)] = v;
  // Squash toward this column's floor point, then push toward the camera.
  if (floorY[i] < 0) continue;
  const y = Math.round(floorY[i] + (j - floorY[i]) * 0.3) + drop;
  if (y < bh + pad) cast[at(i, y)] = Math.max(cast[at(i, y)], v);
}

const [tight, wide, soft] = await Promise.all([
  blur(contact, size * (flat ? 0.002 : 0.006)),
  blur(lower, size * 0.05),
  blur(cast, size * 0.09),
]);

const out = Buffer.alloc(cw * ch * 4);
for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
  const k = j * cw + i, py = j - pad, px = i - pad;
  const inside = px >= 0 && py >= 0 && px < bw && py < bh ? A[py * bw + px] / 255 : 0;
  const v = flat ? Math.min(255, tight[k] * 0.6) : Math.min(230, Math.max(tight[k] * 1.4, wide[k] * 0.8, soft[k] * 0.55));
  out[k * 4 + 3] = Math.round(v * (1 - inside));
}
await sharp(out, { raw: { width: cw, height: ch, channels: 4 } }).webp({ lossless: true }).toFile(`${P}/public/soviet/${id}-s3-shadow.webp`);
console.log(JSON.stringify({ id, shadow: { x: box.x - pad, y: box.y - pad, width: cw, height: ch } }));
