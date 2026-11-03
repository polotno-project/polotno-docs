// Shadows that reach the photo's edge carry on past it, by repeating their
// edge row or column outwards, so a resized piece never shows the shadow's end.
//   node extend-shadows.mjs <example dir>
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
const [, , P] = process.argv;
const file = `${P}/src/soviet.json`;
const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
const W = scene.width, H = scene.height, EXT = 300;
for (const item of scene.slots.flatMap((s) => s.items)) {
  const b = item.shadow;
  if (!b) continue;
  const left = b.x <= 0 ? EXT : 0, right = b.x + b.width >= W ? EXT : 0, bottom = b.y + b.height >= H ? EXT : 0;
  if (!left && !right && !bottom) continue;
  const f = `${P}/public/soviet/${item.id}-shadow.webp`;
  await sharp(await sharp(f).extend({ left, right, bottom, extendWith: 'copy' }).webp({ lossless: true }).toBuffer()).toFile(f);
  item.shadow = { x: b.x - left, y: b.y, width: b.width + left + right, height: b.height + bottom };
  console.log(item.id, JSON.stringify(item.shadow));
}
fs.writeFileSync(file, JSON.stringify(scene, null, 1) + '\n');
