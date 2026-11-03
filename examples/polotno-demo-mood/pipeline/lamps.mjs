// Floor lamps: keep only the lamp (what the render added to the empty room),
// and give each a soft contact shadow at its base instead of an extracted one.
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
const W = 3840, H = 2560;
const rows = fs.readFileSync('out.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const empty = await sharp('empty.png').resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
for (const v of [1, 2, 3]) {
  const id = `lamp-${v}`;
  const row = rows.find((r) => r.id === id);
  const { x, y, width: w, height: h } = row.piece;
  const piece = await sharp(`out/${id}.webp`).ensureAlpha().raw().toBuffer();
  // Remove the side table and plant: they are part of the room, not the lamp.
  const table = await sharp('table-mask.png').extract({ left: x, top: y, width: w, height: h }).blur(4).linear(1.6, 0).extractChannel(0).raw().toBuffer();
  const keep = Buffer.alloc(w * h);
  for (let p = 0; p < w * h; p++) keep[p] = 255 - table[p];
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i;
    piece[k * 4 + 3] = Math.round((piece[k * 4 + 3] * keep[k]) / 255);
    if (piece[k * 4 + 3] > 40) { minX = Math.min(minX, i); maxX = Math.max(maxX, i); minY = Math.min(minY, j); maxY = Math.max(maxY, j); }
  }
  const pw = maxX - minX + 1, ph = maxY - minY + 1;
  const out = await sharp(piece, { raw: { width: w, height: h, channels: 4 } }).extract({ left: minX, top: minY, width: pw, height: ph }).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  fs.writeFileSync(`out/${id}.webp`, out);
  row.piece = { x: x + minX, y: y + minY, width: pw, height: ph };
  // Base = the widest opaque row in the lowest 12% of the lamp.
  const tight = await sharp(out).ensureAlpha().raw().toBuffer();
  let bx0 = pw, bx1 = 0;
  for (let j = Math.floor(ph * 0.88); j < ph; j++) for (let i = 0; i < pw; i++) if (tight[(j * pw + i) * 4 + 3] > 128) { bx0 = Math.min(bx0, i); bx1 = Math.max(bx1, i); }
  const bw = bx1 - bx0 + 1, cxB = row.piece.x + bx0 + bw / 2, cyB = row.piece.y + ph - bw * 0.06;
  const sw = Math.round(bw * 2.4), sh = Math.round(bw * 0.7);
  const svg = `<svg width="${sw}" height="${sh}"><defs><radialGradient id="g"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.55" stop-color="#000" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${sw / 2}" cy="${sh / 2}" rx="${sw / 2}" ry="${sh / 2}" fill="url(#g)"/></svg>`;
  fs.writeFileSync(`out/${id}-shadow.webp`, await sharp(Buffer.from(svg)).webp({ lossless: true }).toBuffer());
  row.shadow = { x: Math.round(cxB - sw / 2), y: Math.round(cyB - sh / 2), width: sw, height: sh };
  console.log(id, JSON.stringify(row.piece), JSON.stringify(row.shadow));
}
fs.writeFileSync('out.jsonl', rows.map((r) => JSON.stringify(r)).join('\n'));
