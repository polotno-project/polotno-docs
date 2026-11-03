// Keep only the largest connected opaque shape of each lamp (drops table slivers).
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
const rows = fs.readFileSync('out.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
for (const v of [1, 2, 3]) {
  const id = `lamp-${v}`, row = rows.find((r) => r.id === id);
  const { data, info } = await sharp(`out/${id}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const lab = new Int32Array(w * h).fill(-1);
  const sizes = [];
  for (let s = 0; s < w * h; s++) {
    if (lab[s] !== -1 || data[s * 4 + 3] < 40) continue;
    const id2 = sizes.length; let n = 0; const stack = [s]; lab[s] = id2;
    while (stack.length) {
      const p = stack.pop(); n++;
      const px = p % w, py = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
        const q = qy * w + qx; if (lab[q] === -1 && data[q * 4 + 3] >= 40) { lab[q] = id2; stack.push(q); }
      }
    }
    sizes.push(n);
  }
  const big = sizes.indexOf(Math.max(...sizes));
  // Soft pixels next to the kept shape stay; everything else goes.
  const keep = Buffer.alloc(w * h);
  for (let p = 0; p < w * h; p++) keep[p] = lab[p] === big ? 255 : 0;
  const grown = await sharp(keep, { raw: { width: w, height: h, channels: 1 } }).blur(2).extractChannel(0).raw().toBuffer();
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let p = 0; p < w * h; p++) {
    if (grown[p] < 30) data[p * 4 + 3] = 0;
    if (data[p * 4 + 3] > 40) { const px = p % w, py = (p / w) | 0; minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
  }
  const pw = maxX - minX + 1, ph = maxY - minY + 1;
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract({ left: minX, top: minY, width: pw, height: ph }).webp({ quality: 92, alphaQuality: 100 }).toFile(`out/${id}.tmp.webp`);
  fs.renameSync(`out/${id}.tmp.webp`, `out/${id}.webp`);
  row.piece = { x: row.piece.x + minX, y: row.piece.y + minY, width: pw, height: ph };
  // Re-centre the contact shadow under the base.
  const t = await sharp(`out/${id}.webp`).ensureAlpha().raw().toBuffer();
  let bx0 = pw, bx1 = 0;
  for (let j = Math.floor(ph * 0.92); j < ph; j++) for (let i = 0; i < pw; i++) if (t[(j * pw + i) * 4 + 3] > 128) { bx0 = Math.min(bx0, i); bx1 = Math.max(bx1, i); }
  const bw = bx1 - bx0 + 1, sw = Math.round(bw * 2.4), sh = Math.round(bw * 0.7);
  const svg = `<svg width="${sw}" height="${sh}"><defs><radialGradient id="g"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.55" stop-color="#000" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${sw / 2}" cy="${sh / 2}" rx="${sw / 2}" ry="${sh / 2}" fill="url(#g)"/></svg>`;
  fs.writeFileSync(`out/${id}-shadow.webp`, await sharp(Buffer.from(svg)).webp({ lossless: true }).toBuffer());
  row.shadow = { x: Math.round(row.piece.x + bx0 + bw / 2 - sw / 2), y: Math.round(row.piece.y + ph - bw * 0.06 - sh / 2), width: sw, height: sh };
  console.log(id, JSON.stringify(row.piece), 'base', bw);
}
fs.writeFileSync('out.jsonl', rows.map((r) => JSON.stringify(r)).join('\n'));
