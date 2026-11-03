// Wall unit room photos: the base room, with only the unit itself (its exact
// cut-out) and a soft contact shadow on the floor next to it taken from the
// unit's render. Curtains, walls and floor elsewhere stay the room's pixels.
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import os from 'node:os';
const token = fs.readFileSync(os.homedir() + '/.config/polotno-remix/token', 'utf8').trim();
const W = 3840, H = 2560, X0 = 2300, CW = W - X0;
const api = async (path, body) => (await fetch(`https://api.replicate.com/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: body && JSON.stringify(body) })).json();
const seg = async (png, version) => {
  let p = await api('predictions', { version, input: { image: 'data:image/png;base64,' + png.toString('base64') } });
  const t0 = Date.now();
  while (!['succeeded', 'failed', 'canceled'].includes(p.status)) { if (Date.now() - t0 > 180000) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 2000)); p = await api(`predictions/${p.id}`); }
  if (p.status !== 'succeeded') throw new Error(p.error);
  const buf = Buffer.from(await (await fetch(Array.isArray(p.output) ? p.output[0] : p.output)).arrayBuffer());
  const m = await sharp(buf).metadata();
  return m.hasAlpha ? sharp(buf).resize(CW, H, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer() : sharp(buf).resize(CW, H, { fit: 'fill' }).greyscale().raw().toBuffer();
};
const BIREF = 'f74986db0355b58403ed20963af156525e2891ea3c2d499bfbfb2a28cd87c5d7';
const BGREM = 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';
const room = await sharp('empty.png').resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
const lin = (v) => v / 255;
const ONLY = process.argv[2] ? [+process.argv[2]] : [1, 2, 3];
await Promise.all(ONLY.map(async (v) => {
  const raw = await sharp(`wall-unit-${v}-render.png`).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  // Colour-match to the room on the left part of the picture.
  const ratios = [[], [], []];
  for (let py = 0; py < H; py += 6) for (let px = 0; px < X0 - 300; px += 6) {
    const q = (py * W + px) * 3;
    for (let c = 0; c < 3; c++) if (room[q + c] > 20 && room[q + c] < 245) ratios[c].push(room[q + c] / Math.max(1, raw[q + c]));
  }
  const g = ratios.map((r) => { r.sort((a, b) => a - b); return r[r.length >> 1]; });
  for (let q = 0; q < raw.length; q += 3) for (let c = 0; c < 3; c++) raw[q + c] = Math.min(255, Math.round(raw[q + c] * g[c]));
  const crop = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).extract({ left: X0, top: 0, width: CW, height: H }).png().toBuffer();
  const unit = Buffer.alloc(CW * H);
  if (process.env.DIFF) {
    // Glossy units fool the background removers: take where the render clearly
    // differs from the empty room, drop thin streaks, then fill each row from
    // the unit's left edge to the frame (it stands against the right wall).
    const a = await sharp(crop).blur(4).raw().toBuffer();
    const b = await sharp(room, { raw: { width: W, height: H, channels: 3 } }).extract({ left: X0, top: 0, width: CW, height: H }).blur(4).raw().toBuffer();
    const d = Buffer.alloc(CW * H);
    for (let k = 0; k < d.length; k++) d[k] = Math.abs(a[k * 3] - b[k * 3]) + Math.abs(a[k * 3 + 1] - b[k * 3 + 1]) + Math.abs(a[k * 3 + 2] - b[k * 3 + 2]) > 60 ? 255 : 0;
    // Where the cabinet is close in colour to the curtain behind it the
    // difference misses it; the background removers still see its shape.
    const [m1, m2] = await Promise.all([seg(crop, BIREF), seg(crop, BGREM)]);
    for (let k = 0; k < d.length; k++) if (m1[k] > 60 || m2[k] > 60) d[k] = 255;
    const open = await sharp(d, { raw: { width: CW, height: H, channels: 1 } }).blur(10).extractChannel(0).raw().toBuffer();
    const left = new Array(H).fill(-1);
    for (let py = 0; py < H; py++) for (let i = 0; i < CW; i++) if (open[py * CW + i] > 200) { left[py] = i; break; }
    // A row's edge can't jut in past its neighbours: take the leftmost edge
    // within 60 rows, so a corner the diff missed is still covered.
    for (let py = 0; py < H; py++) {
      if (left[py] < 0) continue;
      let m = left[py];
      for (let j = Math.max(0, py - 60); j <= Math.min(H - 1, py + 60); j++) if (left[j] >= 0) m = Math.min(m, left[j]);
      // Start a little left of the found edge so the cabinet's own edge is never
      // left half-blended with the curtain behind it.
      for (let i = Math.max(0, m - 24); i < CW; i++) unit[py * CW + i] = 255;
    }
  } else {
    const [m1, m2] = await Promise.all([seg(crop, BIREF), seg(crop, BGREM)]);
    for (let k = 0; k < unit.length; k++) unit[k] = Math.max(m1[k], m2[k]);
  }
  // Keep only the largest solid shape: the unit (drops curtain bits a model may grab).
  const lab = new Int32Array(CW * H).fill(-1), sizes = [];
  for (let s0 = 0; s0 < CW * H; s0++) {
    if (lab[s0] !== -1 || unit[s0] < 128) continue;
    const id = sizes.length; let n = 0; const st = [s0]; lab[s0] = id;
    while (st.length) { const p = st.pop(); n++; const px = p % CW, py = (p / CW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= CW || qy >= H) continue; const q = qy * CW + qx; if (lab[q] === -1 && unit[q] >= 128) { lab[q] = id; st.push(q); } } }
    sizes.push(n);
  }
  const big = sizes.indexOf(Math.max(...sizes));
  for (let k = 0; k < unit.length; k++) if (lab[k] !== big && unit[k] >= 128) unit[k] = 0; else if (lab[k] !== big) unit[k] = Math.min(unit[k], 60);
  // Soft edge, grown 2px so the unit's own outline is fully covered.
  // Solid inside, soft only over the outermost few pixels: a partly opaque
  // mask lets the room behind show through the cabinet as a ghost.
  const solid = Buffer.alloc(CW * H);
  for (let k = 0; k < solid.length; k++) solid[k] = unit[k] >= 128 ? 255 : 0;
  const alpha = await sharp(solid, { raw: { width: CW, height: H, channels: 1 } }).blur(1.2).extractChannel(0).raw().toBuffer();
  // Contact shadow: darkening (render vs room) on the floor within ~140px of the unit's lower part.
  let top = H, bot = 0;
  for (let k = 0; k < unit.length; k++) if (lab[k] === big) { const py = (k / CW) | 0; top = Math.min(top, py); bot = Math.max(bot, py); }
  const near = await sharp(unit, { raw: { width: CW, height: H, channels: 1 } }).blur(70).extractChannel(0).raw().toBuffer();
  const R = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).extract({ left: X0, top: 0, width: CW, height: H }).blur(6).raw().toBuffer();
  const E = await sharp(room, { raw: { width: W, height: H, channels: 3 } }).extract({ left: X0, top: 0, width: CW, height: H }).blur(6).raw().toBuffer();
  const yMin = top + (bot - top) * 0.7;
  const out = Buffer.from(room);
  for (let py = 0; py < H; py++) for (let i = 0; i < CW; i++) {
    const k = py * CW + i, q = (py * W + X0 + i) * 3;
    const a = alpha[k] / 255;
    let shade = 1;
    if (py > yMin && near[k] > 8) {
      const lr = 0.2126 * lin(R[k * 3]) + 0.7152 * lin(R[k * 3 + 1]) + 0.0722 * lin(R[k * 3 + 2]) + 1e-3;
      const le = 0.2126 * lin(E[k * 3]) + 0.7152 * lin(E[k * 3 + 1]) + 0.0722 * lin(E[k * 3 + 2]) + 1e-3;
      const w = Math.min(1, near[k] / 60);
      shade = 1 - (1 - Math.max(0.55, Math.min(1, lr / le))) * w;
    }
    for (let c = 0; c < 3; c++) out[q + c] = Math.round(raw[q + c] * a + room[q + c] * shade * (1 - a));
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`wu-${v}.png`);
  console.log(v, 'gains', g.map((x) => x.toFixed(3)).join(' '));
}));
