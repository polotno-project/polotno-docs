// Sofa shadows: keep only the shade close around the sofa. The render ÷ room
// comparison also picked up faint copies of the wallpaper, picture frame and
// radiator, which show as ghosts once the sofa is resized and its shadow moves.
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
const [, , P, ...dirs] = process.argv;
const scene = JSON.parse(fs.readFileSync(`${P}/src/soviet.json`, 'utf8'));
for (const i of scene.slots.find((s) => s.id === 'sofa').items) {
  const { box, shadow: sb } = i;
  const piece = await sharp(`${P}/public/soviet/${i.id}.webp`).resize(box.width, box.height, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer();
  const near = Buffer.alloc(sb.width * sb.height);
  for (let j = 0; j < box.height; j++) for (let x = 0; x < box.width; x++) {
    const X = box.x - sb.x + x, Y = box.y - sb.y + j;
    if (X >= 0 && Y >= 0 && X < sb.width && Y < sb.height && piece[j * box.width + x] > 32) near[Y * sb.width + X] = 255;
  }
  // Grow the sofa's outline ~150px, softly.
  const grown = await sharp(near, { raw: { width: sb.width, height: sb.height, channels: 1 } }).blur(60).extractChannel(0).raw().toBuffer();
  // Per column, how far down the sofa reaches: the real shade lies on the
  // floor along its base, so anything well above that is wall.
  const bottom = new Float64Array(sb.width).fill(-1);
  for (let X = 0; X < sb.width; X++) for (let Y = sb.height - 1; Y >= 0; Y--) if (near[Y * sb.width + X]) { bottom[X] = Y; break; }
  for (let X = 1; X < sb.width; X++) if (bottom[X] < 0) bottom[X] = bottom[X - 1];
  for (let X = sb.width - 2; X >= 0; X--) if (bottom[X] < 0) bottom[X] = bottom[X + 1];
  for (const dir of dirs) {
    const f = `${dir}/${i.id}-shadow.webp`;
    const sh = await sharp(f).resize(sb.width, sb.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
    for (let y = 0; y < sb.height; y++) {
      for (let x = 0; x < sb.width; x++) {
        const base = Math.min(1, Math.max(0, (y - (bottom[x] - 250)) / 60));
        const k = y * sb.width + x, keep = Math.min(1, grown[k] / 40) * base;
        sh[k * 4] = sh[k * 4 + 1] = sh[k * 4 + 2] = 0;
        sh[k * 4 + 3] = Math.round(sh[k * 4 + 3] * keep);
      }
    }
    await sharp(sh, { raw: { width: sb.width, height: sb.height, channels: 4 } }).webp({ lossless: true }).toFile(f + '.tmp.webp');
    fs.renameSync(f + '.tmp.webp', f);
  }
  console.log(i.id);
}
