// TVs: a small drawn contact shadow right under the stand instead of a
// measured one (which was taken without a wall unit and smeared across it).
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
const rows = fs.readFileSync('out.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
for (const v of [1, 2, 3]) {
  const id = `tv-${v}`, row = rows.find((r) => r.id === id);
  const { x, y, width: w, height: h } = row.piece;
  const sw = Math.round(w * 1.12), sh = Math.round(w * 0.16);
  const svg = `<svg width="${sw}" height="${sh}"><defs><radialGradient id="g"><stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="0.6" stop-color="#000" stop-opacity="0.2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${sw / 2}" cy="${sh / 2}" rx="${sw / 2}" ry="${sh / 2}" fill="url(#g)"/></svg>`;
  fs.writeFileSync(`out/${id}-shadow.webp`, await sharp(Buffer.from(svg)).webp({ lossless: true }).toBuffer());
  row.shadow = { x: Math.round(x + w / 2 - sw / 2), y: Math.round(y + h - sh * 0.55), width: sw, height: sh };
}
fs.writeFileSync('out.jsonl', rows.map((r) => JSON.stringify(r)).join('\n'));
console.log('ok');
