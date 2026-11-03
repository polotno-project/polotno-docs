// Soviet room export: her photo's layout, wall unit as a room-photo swap,
// pieces fitted to her originals' footprints. Writes public/soviet + src/soviet.json.
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
const [, , D, P] = process.argv;
const OUT = `${P}/public/soviet`;
// Overwrite in place: removing the folder makes the dev server lose track of it.
fs.mkdirSync(OUT, { recursive: true });
const B = Object.fromEntries(fs.readFileSync(`${D}/out.jsonl`, 'utf8').trim().split('\n').map((l) => { const j = JSON.parse(l); return [j.id, j]; }));
const W = 3840, H = 2560;
// Scale a box about an anchor point, then move it.
const fit = (box, [ax, ay], s, dx = 0, dy = 0) => ({ x: Math.round(ax + (box.x - ax) * s + dx), y: Math.round(ay + (box.y - ay) * s + dy), width: Math.round(box.width * s), height: Math.round(box.height * s) });
const bottomCentre = (b) => [b.x + b.width / 2, b.y + b.height];
const TV_DX = -170;
// Where the floor's depth lines meet (back wall centre, at eye height).
const VP = [1920, 1030];
const SIZE = {
  // Her cut-out sofas come out a touch larger than her own; shrink towards the frame corner.
  // Scaled about their own feet (bottom-left), so they stay on the floor.
  // Coffee tables: moved deeper into the room by scaling toward the room's
  // vanishing point, which keeps them on the floor and in perspective.
  table: () => ({ anchor: VP, s: 0.8 }),
  // Armchairs read too big; shrink about their own feet.
  armchair: (p) => ({ anchor: bottomCentre(p), s: 0.72 }),
  // TV cabinets keep to the original's footprint, left of the wall unit.
  // TVs: 10% smaller and moved left, in front of the curtain, so they cover
  // less of the wall unit. Styles 2 and 3 take style 1's footprint.
  'tv-1': (p) => ({ anchor: [p.x, p.y + p.height], s: 0.9, dx: TV_DX }),
  'tv-2': (p) => { const t = B['tv-1'].piece, s = (t.width * 0.9) / p.width; return { anchor: [p.x, p.y + p.height], s, dx: t.x - p.x + TV_DX }; },
  'tv-3': (p) => { const t = B['tv-1'].piece, s = (t.width * 0.9) / p.width; return { anchor: [p.x, p.y + p.height], s, dx: t.x - p.x + TV_DX }; },
};
// Floor pieces get a soft contact shadow traced from their own outline: the
// darkening right where a piece meets the floor, which the measured shadow
// alone leaves too faint, so pieces read as floating.
// Sofas carry their full measured shade instead (they're far from the door).
const CONTACT = ['armchair', 'table', 'tv'];
async function contact(id, box, shadow) {
  const bw = Math.round(box.width), bh = Math.round(box.height);
  const pad = Math.round(Math.max(bw, bh) * 0.15);
  const alpha = await sharp(`${D}/out/${id}.webp`).resize(bw, bh, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer();
  const cwid = bw + pad * 2, chgt = bh + pad * 2;
  const canvas = Buffer.alloc(cwid * chgt);
  const drop = Math.round(bh * 0.012);
  for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
    const y2 = j + pad + drop; if (y2 >= chgt) continue;
    canvas[y2 * cwid + i + pad] = alpha[j * bw + i];
  }
  // A piece cut off by the left frame edge carries on beyond it: repeat its
  // edge column outwards, so the blurred shadow doesn't fade out at the frame.
  if (box.x <= 2) for (let j = 0; j < chgt; j++) {
    const v = canvas[j * cwid + pad];
    for (let i = 0; i < pad; i++) canvas[j * cwid + i] = v;
  }
  // Two layers: a tight dark line where it touches, and a wide soft spread.
  const tight = await sharp(canvas, { raw: { width: cwid, height: chgt, channels: 1 } }).blur(Math.max(4, bw * 0.01)).extractChannel(0).raw().toBuffer();
  const wide = await sharp(canvas, { raw: { width: cwid, height: chgt, channels: 1 } }).blur(Math.max(10, bw * 0.045)).extractChannel(0).raw().toBuffer();
  // Only below the lower part of the piece, never over the piece itself.
  const ao = Buffer.alloc(cwid * chgt);
  for (let j = 0; j < chgt; j++) for (let i = 0; i < cwid; i++) {
    const py = j - pad, px = i - pad;
    if (py < bh * 0.45) continue;
    const inside = px >= 0 && py >= 0 && px < bw && py < bh ? alpha[py * bw + px] : 0;
    const k = Math.min(1, (py - bh * 0.45) / (bh * 0.2));
    const v = Math.max(tight[j * cwid + i] * 0.75, wide[j * cwid + i] * 0.5) * k;
    ao[j * cwid + i] = Math.round(v * (1 - inside / 255));
  }
  // Union with the measured shadow, keeping the stronger value.
  const ux0 = Math.min(shadow.x, box.x - pad), uy0 = Math.min(shadow.y, box.y - pad);
  const ux1 = Math.max(shadow.x + shadow.width, box.x - pad + cwid), uy1 = Math.max(shadow.y + shadow.height, box.y - pad + chgt);
  const uw = ux1 - ux0, uh = uy1 - uy0;
  const out = Buffer.alloc(uw * uh * 4);
  const sh = await sharp(`${D}/out/${id}-shadow.webp`).resize(shadow.width, shadow.height, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer();
  for (let j = 0; j < shadow.height; j++) for (let i = 0; i < shadow.width; i++) out[((shadow.y - uy0 + j) * uw + shadow.x - ux0 + i) * 4 + 3] = sh[j * shadow.width + i];
  const ox = box.x - pad - ux0, oy = box.y - pad - uy0;
  for (let j = 0; j < chgt; j++) for (let i = 0; i < cwid; i++) { const q = ((oy + j) * uw + ox + i) * 4 + 3; out[q] = Math.max(out[q], ao[j * cwid + i]); }
  await sharp(out, { raw: { width: uw, height: uh, channels: 4 } }).webp({ lossless: true }).toFile(`${OUT}/${id}-shadow.webp`);
  return { x: ux0, y: uy0, width: uw, height: uh };
}

const LABEL = { tv: 'TV', 'wall-carpet': 'Wall carpet', rug: 'Carpet', lamp: 'Lamp', sofa: 'Sofa', armchair: 'Armchair', table: 'Table' };
// Back to front: the table now stands deeper than the armchair.
const ORDER = ['wall-carpet', 'rug', 'tv', 'lamp', 'sofa', 'table', 'armchair'];
const slots = [];
for (const slot of ORDER) {
  const items = [];
  for (const v of [1, 2, 3]) {
    const id = `${slot}-${v}`;
    const rule = SIZE[id] || SIZE[slot];
    let box = B[id].piece, shadow = B[id].shadow;
    if (rule) { const r = rule(box); box = fit(box, r.anchor, r.s, r.dx); shadow = fit(shadow, r.anchor, r.s, r.dx); }
    fs.copyFileSync(`${D}/out/${id}.webp`, `${OUT}/${id}.webp`);
    if (CONTACT.includes(slot)) shadow = await contact(id, box, shadow);
    else fs.copyFileSync(`${D}/out/${id}-shadow.webp`, `${OUT}/${id}-shadow.webp`);
    items.push({ id, box, shadow });
  }
  const b = items[0].box;
  const spot = slot === 'rug' ? { x: Math.round(b.x + b.width * 0.7), y: Math.round(b.y + b.height * 0.75) } : { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height * 0.55) };
  slots.push({ id: slot, label: LABEL[slot], beforeShadows: ['wall-carpet', 'rug'].includes(slot), spot, items });
}
await sharp(`${D}/empty.png`).webp({ quality: 90 }).toFile(`${OUT}/room.webp`);
const units = [];
for (const v of [1, 2, 3]) {
  await sharp(`${D}/wu-${v}.png`).webp({ quality: 90 }).toFile(`${OUT}/room-wall-unit-${v}.webp`);
  await sharp(`${D}/wu-${v}.png`).extract({ left: 2850, top: 0, width: 990, height: 2000 }).resize(240).webp({ quality: 85 }).toFile(`${OUT}/wall-unit-${v}-thumb.webp`);
  units.push({ id: `wall-unit-${v}`, src: `soviet/room-wall-unit-${v}.webp`, thumb: `soviet/wall-unit-${v}-thumb.webp` });
}
fs.writeFileSync(`${P}/src/soviet.json`, JSON.stringify({ width: W, height: H, src: 'soviet/room.webp', wallUnit: { id: 'wall-unit', label: 'Wall unit', spot: { x: 3500, y: 1080 }, items: units }, slots }, null, 1));
console.log('ok');
