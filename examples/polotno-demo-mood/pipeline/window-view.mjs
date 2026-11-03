// The view out of the window: a generated Soviet five-storey block (one per
// light, pipeline/view/plate-<light>.png, the sun and night ones edited from
// the cloudy one so it's the same building), put into the window glass of
// every room picture of that light. glass-mask.png marks the glass;
// glass-mask-<light>.png overrides it where that light's render moved the
// window (night: the balcony door came out closed).
//   node window-view.mjs <example dir> [lights…]
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
const [, , P, ...only] = process.argv;
const V = `${P}/pipeline/view`;
const scene = JSON.parse(fs.readFileSync(`${P}/src/soviet.json`, 'utf8'));
const W = scene.width, H = scene.height;
for (const light of only.length ? only : ['cloudy', 'sun', 'night']) {
  const maskFile = fs.existsSync(`${V}/glass-mask-${light}.png`) ? `${V}/glass-mask-${light}.png` : `${V}/glass-mask.png`;
  const glass = await sharp(maskFile).resize(W, H, { fit: 'fill' }).extractChannel(0).raw().toBuffer();
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let k = 0; k < W * H; k++) if (glass[k] > 128) { const x = k % W, y = (k / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const soft = await sharp(glass, { raw: { width: W, height: H, channels: 1 } }).blur(1.5).extractChannel(0).raw().toBuffer();
  // Out of focus, as with a camera focused on the room, and a little hazier,
  // so the view sits back instead of pulling the eye.
  const plate = await sharp(`${V}/plate-${light}.png`).resize(bw, bh, { fit: 'cover' }).removeAlpha()
    .blur(+(process.env.BLUR || 3)).linear(0.9, 255 * 0.1 * 0.5).raw().toBuffer();
  const materials = fs.existsSync(`${P}/src/materials.json`) ? JSON.parse(fs.readFileSync(`${P}/src/materials.json`, 'utf8')) : {};
  const units = scene.wallUnit.items.flatMap((u) => [u.src, ...Object.keys(materials[u.id] || {}).map((m) => u.src.replace('.webp', `-${m}.webp`))]);
  const files = [`soviet/room-${light}.webp`, ...units.map((src) => src.replace('.webp', `-${light}.webp`))];
  for (const f of files) {
    const path = `${P}/public/${f}`;
    const img = await sharp(path).removeAlpha().raw().toBuffer();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = y * W + x, a = soft[k] / 255;
      if (!a) continue;
      const p = ((y - y0) * bw + x - x0) * 3;
      // Seen through glass: a touch darker than the open air.
      for (let c = 0; c < 3; c++) img[k * 3 + c] = Math.round(img[k * 3 + c] * (1 - a) + plate[p + c] * 0.93 * a);
    }
    await sharp(img, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(path + '.tmp');
    fs.renameSync(path + '.tmp', path);
  }
  console.log(light, files.length);
}
