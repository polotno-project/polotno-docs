// Room lights (Day / Sun / Night) without re-rendering any piece.
//
// The empty room is rendered once per light (light-<name>.png, Nano Banana,
// same framing). The light map is that render divided by today's room, per
// colour channel and smoothed, so it says how much brighter, darker or warmer
// each spot gets. Every piece is multiplied by the map where it stands; each
// wall unit (a whole room photo) takes the new room, with its unit relit the
// same way. Writes <id>-<light>.webp next to the originals.
//   node relight.mjs <example dir> <dir with light-*.png> <light> [<light render file>]
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';

const [, , P, D, light, file = `${D}/light-${light}.png`] = process.argv;
const pub = `${P}/public`;
const scene = JSON.parse(fs.readFileSync(`${P}/src/soviet.json`, 'utf8'));
const W = scene.width, H = scene.height;

const base = await sharp(`${pub}/${scene.src}`).removeAlpha().raw().toBuffer();
const lit = await sharp(file).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
const smooth = (buf, s) => sharp(buf, { raw: { width: W, height: H, channels: 3 } }).blur(s).raw().toBuffer();
const sums = [0, 0, 0, 0, 0, 0];
const lum = (buf, k) => 0.299 * buf[k * 3] + 0.587 * buf[k * 3 + 1] + 0.114 * buf[k * 3 + 2];
const ratioMap = async (sigma) => {
  const [b, l] = await Promise.all([smooth(base, sigma), smooth(lit, sigma)]);
  // Brightness changes from spot to spot; colour changes only once, for the
  // whole room. Per-channel ratios from spot to spot go wrong where the room is
  // dark (a small number divided by a small number), printing purple or green
  // blotches onto pieces.
  if (!sums[0]) for (let k = 0; k < W * H; k++) for (let c = 0; c < 3; c++) { sums[c] += l[k * 3 + c]; sums[c + 3] += b[k * 3 + c]; }
  const mean = (o) => (0.299 * sums[o] + 0.587 * sums[o + 1] + 0.114 * sums[o + 2]);
  const tint = [0, 1, 2].map((c) => (sums[c] / sums[c + 3]) / (mean(0) / mean(3)));
  const r = new Float32Array(W * H * 3);
  for (let k = 0; k < W * H; k++) {
    const v = Math.min(3, Math.max(0.05, (lum(l, k) + 1) / (lum(b, k) + 1)));
    for (let c = 0; c < 3; c++) r[k * 3 + c] = v * tint[c];
  }
  return [r, tint];
};
// Wall units are part of the room and take its light closely. Pieces take it
// smoothed much wider: they stand in front of the floor and wall, and the
// edge of a sun patch or of a lamp's pool of light would print across a seat
// as a band.
const [ratio, tint] = await ratioMap(60);
const [pieceRatio] = await ratioMap(160);
console.log(light, 'tint', tint.map((t) => t.toFixed(3)).join(' '));

// Brightened values level off softly instead of clipping: a lamp at night
// lights one arm of a sofa several times brighter than the rest, and clipped
// it shines flat white like glass.
const KNEE = 170;
const shoulder = (v) => (v <= KNEE ? v : KNEE + (255 - KNEE) * (1 - Math.exp(-(v - KNEE) / (255 - KNEE))));

async function relightPiece(id, box) {
  const src = `${pub}/soviet/${id}.webp`;
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const fw = info.width, fh = info.height;
  for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
    const X = Math.min(W - 1, Math.max(0, Math.round(box.x + (i * box.width) / fw)));
    const Y = Math.min(H - 1, Math.max(0, Math.round(box.y + (j * box.height) / fh)));
    const p = (j * fw + i) * 4, r = (Y * W + X) * 3;
    if (!data[p + 3]) continue;
    for (let c = 0; c < 3; c++) data[p + c] = Math.round(shoulder(data[p + c] * pieceRatio[r + c]));
  }
  await sharp(data, { raw: { width: fw, height: fh, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${pub}/soviet/${id}-${light}.webp`);
}

// Materials (pipeline/materials.mjs): pieces with their own cut-out and box,
// and wall units as more room photos.
const materials = fs.existsSync(`${P}/src/materials.json`) ? JSON.parse(fs.readFileSync(`${P}/src/materials.json`, 'utf8')) : {};
const units = [...scene.wallUnit.items];
for (const [id, mats] of Object.entries(materials)) for (const [m, v] of Object.entries(mats)) {
  const u = scene.wallUnit.items.find((x) => x.id === id);
  if (u) units.push({ ...u, src: u.src.replace('.webp', `-${m}.webp`) });
  else await relightPiece(`${id}-${m}`, v.box);
}
for (const item of scene.slots.flatMap((s) => s.items)) await relightPiece(item.id, item.box);

// The room itself, and each wall unit: the new room, with the unit (where the
// wall-unit photo differs from the empty room) relit by the map.
await sharp(lit, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(`${pub}/soviet/room-${light}.webp`);
for (const unit of units) {
  const wu = await sharp(`${pub}/${unit.src}`).removeAlpha().raw().toBuffer();
  // A material unit carries its own area (materials.mjs): a white door
  // against a pale wall barely differs from the empty room, so a colour
  // difference would leave holes that show the wall through it.
  const areaFile = `${pub}/${unit.src.replace('.webp', '-area.png')}`;
  let m, full = fs.existsSync(areaFile);
  if (full) m = await sharp(areaFile).extractChannel(0).raw().toBuffer();
  else {
    const diff = Buffer.alloc(W * H);
    for (let k = 0; k < W * H; k++) diff[k] = Math.max(Math.abs(wu[k * 3] - base[k * 3]), Math.abs(wu[k * 3 + 1] - base[k * 3 + 1]), Math.abs(wu[k * 3 + 2] - base[k * 3 + 2])) > 18 ? 255 : 0;
    m = await sharp(diff, { raw: { width: W, height: H, channels: 1 } }).blur(6).extractChannel(0).raw().toBuffer();
  }
  const out = Buffer.alloc(W * H * 3);
  for (let k = 0; k < W * H; k++) {
    const a = full ? m[k] / 255 : Math.min(1, m[k] / 128);
    for (let c = 0; c < 3; c++) out[k * 3 + c] = Math.round(lit[k * 3 + c] * (1 - a) + Math.min(255, wu[k * 3 + c] * ratio[k * 3 + c]) * a);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(`${pub}/${unit.src.replace('.webp', `-${light}.webp`)}`);
}
console.log('relit', light);
