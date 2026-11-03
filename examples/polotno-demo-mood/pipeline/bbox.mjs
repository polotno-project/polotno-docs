// Where a render differs from the empty room: bounding box of the changed area,
// plus how much the untouched wall drifted (a sign Nano Banana reframed the room).
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
const [, , ROOM, ...renders] = process.argv;
const w = 312, h = 208, k = +(process.env.W || 2496) / w;
const small = async (f) => sharp(f).resize(w, h, { fit: "fill" }).blur(2.5).removeAlpha().raw().toBuffer();
const E = await small(ROOM);
for (const f of renders) {
  const R = await small(f);
  const diff = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) diff[p] = Math.abs(R[p * 3] - E[p * 3]) + Math.abs(R[p * 3 + 1] - E[p * 3 + 1]) + Math.abs(R[p * 3 + 2] - E[p * 3 + 2]);
  const col = new Array(w).fill(0), row = new Array(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (diff[y * w + x] > 90) { col[x]++; row[y]++; }
  const span = (a, min) => { let s = a.findIndex((v) => v >= min), e = a.length - 1 - [...a].reverse().findIndex((v) => v >= min); return [s, e]; };
  const [x0, x1] = span(col, 4), [y0, y1] = span(row, 4);
  const sorted = [...diff].sort((a, b) => a - b);
  console.log(JSON.stringify({ f: f.split('/').pop(), box: [Math.round(x0 * k), Math.round(y0 * k), Math.round((x1 - x0 + 1) * k), Math.round((y1 - y0 + 1) * k)], medianDiff: Math.round(sorted[sorted.length >> 1]) }));
}
