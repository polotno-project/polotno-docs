// Repaint mode (dev server only): fix one region of one piece by hand.
//
// The editor posts a brushed mask (in room pixels) and a prompt. Nano Banana
// Pro repaints that region of the room as it looks now (room + shadow +
// piece), and only the brushed pixels are taken back:
// - a piece gets new colour there, and new alpha where the repaint differs
//   from the empty floor or wall behind it (so a fix can grow or trim the
//   cut-out); its shadow is re-measured where the piece no longer covers;
// - a background slot (wall unit) is a whole room photo, so the repaint is
//   simply blended into it.
// "Erase" cuts the brushed region out of a piece without AI.
// Every write is backed up to .repaint-history/ first, and Undo restores it.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function repaint() {
  return {
    name: 'repaint',
    // The scene files are rewritten by the tools while the editor is open, and
    // the editor updates itself; a reload would throw away unsaved layout.
    handleHotUpdate({ file }) {
      if (/src\/(soviet|layout)\.json$/.test(file)) return [];
    },
    configureServer(server) {
      const root = server.config.root;
      server.middlewares.use('/__repaint', (req, res) => {
        if (req.method !== 'POST') return res.end();
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', async () => {
          try {
            const out = await handle(root, JSON.parse(body));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, ...out }));
          } catch (err) {
            console.error('[repaint]', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
          }
        });
      });
    },
  };
}

async function handle(root, req) {
  const sharp = require('sharp');
  const pub = path.join(root, 'public');
  const history = path.join(root, '.repaint-history');
  if (req.action === 'undo') return undo(history, pub);

  const scene = JSON.parse(fs.readFileSync(path.join(root, 'src/soviet.json'), 'utf8'));
  const unit = scene.wallUnit.items.find((i) => i.id === req.id);
  const piece = scene.slots.flatMap((s) => s.items).find((i) => i.id === req.id);
  if (!unit && !piece) throw new Error(`unknown piece ${req.id}`);

  // The brushed mask comes in as a PNG covering `req.crop` (room pixels).
  const { x: mx, y: my, width: mw, height: mh } = req.crop;
  const maskPng = Buffer.from(req.mask.split(',')[1], 'base64');
  const maskIn = await sharp(maskPng).resize(mw, mh, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer();
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) if (maskIn[j * mw + i] > 20) {
    x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j);
  }
  if (x1 < 0) throw new Error('brush over the part to fix first');

  // Room pixels as they look now, without the piece (`bg`) and with it (`now`).
  const W = scene.width, H = scene.height;
  const roomFile = path.join(pub, unit ? unit.src : scene.src);
  const room = await sharp(roomFile).removeAlpha().raw().toBuffer();
  const bg = Buffer.from(room);
  const now = Buffer.from(room);
  let pc, sh, box, shBox, fw, fh;
  const files = unit
    ? [unit.src, unit.thumb]
    : [`soviet/${piece.id}.webp`, `soviet/${piece.id}-shadow.webp`];
  if (piece) {
    box = piece.box;
    shBox = piece.shadow;
    const meta = await sharp(path.join(pub, `soviet/${piece.id}.webp`)).metadata();
    fw = meta.width; fh = meta.height;
    pc = await sharp(path.join(pub, `soviet/${piece.id}.webp`)).resize(box.width, box.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
    sh = await sharp(path.join(pub, `soviet/${piece.id}-shadow.webp`)).resize(shBox.width, shBox.height, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
    for (let j = 0; j < shBox.height; j++) for (let i = 0; i < shBox.width; i++) {
      const X = shBox.x + i, Y = shBox.y + j;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const a = sh[(j * shBox.width + i) * 4 + 3] / 255, k = (Y * W + X) * 3;
      for (let c = 0; c < 3; c++) bg[k + c] = now[k + c] = Math.round(room[k + c] * (1 - a));
    }
    for (let j = 0; j < box.height; j++) for (let i = 0; i < box.width; i++) {
      const X = box.x + i, Y = box.y + j;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const p = (j * box.width + i) * 4, a = pc[p + 3] / 255, k = (Y * W + X) * 3;
      for (let c = 0; c < 3; c++) now[k + c] = Math.round(now[k + c] * (1 - a) + pc[p + c] * a);
    }
  }

  // Full-room mask, softened at the edge so the fix blends in.
  const mask = Buffer.alloc(W * H);
  for (let j = 0; j < mh; j++) for (let i = 0; i < mw; i++) {
    const X = mx + i, Y = my + j;
    if (X >= 0 && Y >= 0 && X < W && Y < H) mask[Y * W + X] = maskIn[j * mw + i];
  }

  // Work on the brushed area plus plenty of surroundings, so the model sees
  // what the fix has to match.
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const pad = Math.max(320, Math.round(Math.max(bw, bh) * 0.8));
  const A = { x: Math.max(0, mx + x0 - pad), y: Math.max(0, my + y0 - pad) };
  A.w = Math.min(W, mx + x1 + 1 + pad) - A.x;
  A.h = Math.min(H, my + y1 + 1 + pad) - A.y;
  const cropOf = (buf, ch) => {
    const out = Buffer.alloc(A.w * A.h * ch);
    for (let j = 0; j < A.h; j++) buf.copy(out, j * A.w * ch, ((A.y + j) * W + A.x) * ch, ((A.y + j) * W + A.x + A.w) * ch);
    return out;
  };
  const nowA = cropOf(now, 3), bgA = cropOf(bg, 3), roomA = cropOf(room, 3);
  const soft = await sharp(cropOf(mask, 1), { raw: { width: A.w, height: A.h, channels: 1 } })
    .blur(Math.max(2, Math.max(A.w, A.h) * 0.004)).extractChannel(0).raw().toBuffer();

  let result;
  if (req.action === 'erase') {
    if (!piece) throw new Error('erase works on pieces, not the wall unit');
  } else {
    result = await nanoBanana(sharp, nowA, cropOf(mask, 1), A, req.prompt);
  }

  // Back up what is about to change.
  const stamp = String(Date.now());
  fs.mkdirSync(path.join(history, stamp), { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(pub, f), path.join(history, stamp, path.basename(f)));
  fs.writeFileSync(path.join(history, stamp, 'files.json'), JSON.stringify({ id: req.id, files, prompt: req.prompt, action: req.action }));
  if (result) await sharp(result, { raw: { width: A.w, height: A.h, channels: 3 } }).png().toFile(path.join(history, stamp, 'ai.png'));

  if (unit) {
    const out = Buffer.from(room);
    for (let j = 0; j < A.h; j++) for (let i = 0; i < A.w; i++) {
      const m = soft[j * A.w + i] / 255;
      if (!m) continue;
      const k = ((A.y + j) * W + A.x + i) * 3, r = (j * A.w + i) * 3;
      for (let c = 0; c < 3; c++) out[k + c] = Math.round(room[k + c] * (1 - m) + result[r + c] * m);
    }
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 90 }).toFile(path.join(pub, unit.src));
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).extract({ left: 2850, top: 0, width: 990, height: 2000 }).resize(240).webp({ quality: 85 }).toFile(path.join(pub, unit.thumb));
    return { id: req.id, stamp };
  }

  // Piece: new alpha where the repaint differs from what's behind the piece.
  let diff;
  if (result) {
    const blur = (b) => sharp(b, { raw: { width: A.w, height: A.h, channels: 3 } }).blur(1.5).raw().toBuffer();
    const [rb, bb] = await Promise.all([blur(result), blur(bgA)]);
    diff = Buffer.alloc(A.w * A.h);
    for (let n = 0; n < A.w * A.h; n++) {
      const d = Math.max(Math.abs(rb[n * 3] - bb[n * 3]), Math.abs(rb[n * 3 + 1] - bb[n * 3 + 1]), Math.abs(rb[n * 3 + 2] - bb[n * 3 + 2]));
      diff[n] = Math.round(255 * Math.min(1, Math.max(0, (d - 14) / 22)));
    }
    diff = await sharp(diff, { raw: { width: A.w, height: A.h, channels: 1 } }).blur(1).extractChannel(0).raw().toBuffer();
  }
  // A repaint can reach past the piece's box (a table top the cut clipped):
  // grow the box to take it in.
  const kx = fw / box.width, ky = fh / box.height;
  const nb = { x: box.x, y: box.y, r: box.x + box.width, b: box.y + box.height };
  if (result) for (let j = 0; j < A.h; j++) for (let i = 0; i < A.w; i++) {
    const n = j * A.w + i;
    if (soft[n] < 128 || diff[n] < 128) continue;
    nb.x = Math.min(nb.x, A.x + i); nb.r = Math.max(nb.r, A.x + i + 1);
    nb.y = Math.min(nb.y, A.y + j); nb.b = Math.max(nb.b, A.y + j + 1);
  }
  const grown = { x: nb.x, y: nb.y, width: nb.r - nb.x, height: nb.b - nb.y };
  const ox = box.x - grown.x, oy = box.y - grown.y;
  const ext = {
    left: Math.round(ox * kx), top: Math.round(oy * ky),
    right: Math.round((nb.r - box.x - box.width) * kx), bottom: Math.round((nb.b - box.y - box.height) * ky),
  };
  const gw = grown.width, gh = grown.height, fw2 = fw + ext.left + ext.right, fh2 = fh + ext.top + ext.bottom;

  // Edit the piece at its box size, then carry the change into the file,
  // which can be larger than its box. A repaint only adds to the piece (a
  // shiny top can look like floor and would punch holes); Erase takes away.
  const edited = Buffer.alloc(gw * gh * 4);
  for (let j = 0; j < box.height; j++) pc.copy(edited, ((j + oy) * gw + ox) * 4, j * box.width * 4, (j + 1) * box.width * 4);
  const pm = Buffer.alloc(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const ax = grown.x + i - A.x, ay = grown.y + j - A.y;
    if (ax < 0 || ay < 0 || ax >= A.w || ay >= A.h) continue;
    const n = ay * A.w + ax, m = soft[n] / 255;
    if (!m) continue;
    const p = (j * gw + i) * 4, old = edited[p + 3];
    pm[j * gw + i] = soft[n];
    if (!result) { edited[p + 3] = Math.round(old * (1 - m)); continue; }
    for (let c = 0; c < 3; c++) edited[p + c] = Math.round(edited[p + c] * (old / 255) * (1 - m) + result[n * 3 + c] * (1 - (old / 255) * (1 - m)));
    edited[p + 3] = Math.round(old * (1 - m) + Math.max(old, diff[n]) * m);
  }
  const big = (buf, ch) => sharp(buf, { raw: { width: gw, height: gh, channels: ch } }).resize(fw2, fh2, { fit: 'fill' });
  const [orig, up, um] = await Promise.all([
    sharp(path.join(pub, `soviet/${piece.id}.webp`)).ensureAlpha().extend({ ...ext, background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().toBuffer(),
    big(edited, 4).raw().toBuffer(),
    big(pm, 1).extractChannel(0).raw().toBuffer(),
  ]);
  fw = fw2; fh = fh2;
  for (let n = 0; n < fw * fh; n++) {
    const m = um[n] / 255;
    if (!m) continue;
    for (let c = 0; c < 4; c++) orig[n * 4 + c] = Math.round(orig[n * 4 + c] * (1 - m) + up[n * 4 + c] * m);
  }
  await sharp(orig, { raw: { width: fw, height: fh, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(pub, `soviet/${piece.id}.webp`));

  // Record the grown box; a hand-placed box grows with it, at its own scale.
  let grow = null;
  if (ox || oy || grown.width !== box.width || grown.height !== box.height) {
    grow = { from: box, to: grown };
    files.push('../src/soviet.json', '../src/layout.json');
    fs.copyFileSync(path.join(root, 'src/soviet.json'), path.join(history, stamp, 'soviet.json'));
    fs.copyFileSync(path.join(root, 'src/layout.json'), path.join(history, stamp, 'layout.json'));
    fs.writeFileSync(path.join(history, stamp, 'files.json'), JSON.stringify({ id: req.id, files, prompt: req.prompt, action: req.action }));
    piece.box = grown;
    fs.writeFileSync(path.join(root, 'src/soviet.json'), JSON.stringify(scene, null, 1) + '\n');
    const layoutFile = path.join(root, 'src/layout.json');
    const layout = JSON.parse(fs.readFileSync(layoutFile, 'utf8'));
    if (layout[piece.id]) {
      layout[piece.id] = growBox(layout[piece.id], grow);
      fs.writeFileSync(layoutFile, JSON.stringify(layout, null, 1) + '\n');
    }
  }

  // Shadow: where the brushed region is now floor or wall, measure the shade
  // the repaint put there (repaint ÷ empty room), as the bake did.
  if (result) {
    const outSh = Buffer.from(sh);
    for (let j = 0; j < shBox.height; j++) for (let i = 0; i < shBox.width; i++) {
      const ax = shBox.x + i - A.x, ay = shBox.y + j - A.y;
      if (ax < 0 || ay < 0 || ax >= A.w || ay >= A.h) continue;
      const n = ay * A.w + ax, m = (soft[n] / 255) * (1 - diff[n] / 255);
      if (!m) continue;
      const lum = (b, k) => 0.299 * b[k] + 0.587 * b[k + 1] + 0.114 * b[k + 2];
      const s = Math.min(0.85, Math.max(0, 1 - lum(result, n * 3) / Math.max(1, lum(roomA, n * 3))));
      const p = (j * shBox.width + i) * 4;
      outSh[p] = outSh[p + 1] = outSh[p + 2] = 0;
      outSh[p + 3] = Math.round(sh[p + 3] * (1 - m) + s * 255 * m);
    }
    await sharp(outSh, { raw: { width: shBox.width, height: shBox.height, channels: 4 } }).webp({ lossless: true }).toFile(path.join(pub, `soviet/${piece.id}-shadow.webp`));
  }
  return { id: req.id, stamp, grow };
}

// Grow a placed box the way its piece's base box grew.
export const growBox = (b, { from, to }) => {
  const s = b.width / from.width;
  return {
    x: Math.round(b.x + (to.x - from.x) * s),
    y: Math.round(b.y + (to.y - from.y) * s),
    width: Math.round(to.width * s),
    height: Math.round(to.height * s),
  };
};

// One Nano Banana Pro pass over the crop: the photo, plus a copy with the
// region to change tinted red. Comes back colour-matched to the input outside
// the brushed region, so the fix doesn't shift the room's colour.
async function nanoBanana(sharp, rgb, maskA, A, prompt) {
  const token = fs.readFileSync(path.join(os.homedir(), '.config/polotno-remix/token'), 'utf8').trim();
  const marked = Buffer.from(rgb);
  for (let n = 0; n < A.w * A.h; n++) if (maskA[n] > 20) {
    marked[n * 3] = Math.round(marked[n * 3] * 0.45 + 255 * 0.55);
    marked[n * 3 + 1] = Math.round(marked[n * 3 + 1] * 0.45);
    marked[n * 3 + 2] = Math.round(marked[n * 3 + 2] * 0.45);
  }
  const jpeg = async (b) => 'data:image/jpeg;base64,' + (await sharp(b, { raw: { width: A.w, height: A.h, channels: 3 } }).jpeg({ quality: 94 }).toBuffer()).toString('base64');
  const text = [
    'Image 1 is a photo of a room. Image 2 is the same photo with one area tinted red.',
    'Return image 1 with ONLY the red-tinted area changed, and no red tint anywhere.',
    `The change: ${prompt?.trim() || 'fix the defect in that area so it looks like a real, clean photo of the same object'}.`,
    'Everything outside that area must stay pixel-identical: same framing, camera, perspective, lighting, colours, grain and sharpness. Photorealistic.',
  ].join(' ');
  const input = {
    prompt: text,
    image_input: [await jpeg(rgb), await jpeg(marked)],
    aspect_ratio: 'match_input_image',
    resolution: Math.max(A.w, A.h) > 2000 ? '4K' : '2K',
    output_format: 'png',
  };
  let p;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://api.replicate.com/v1/models/google/nano-banana-pro/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' },
      body: JSON.stringify({ input }),
    });
    p = await res.json();
    while (p.id && !['succeeded', 'failed', 'canceled'].includes(p.status)) {
      await new Promise((r) => setTimeout(r, 3000));
      p = await (await fetch(`https://api.replicate.com/v1/predictions/${p.id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
    }
    if (p.status === 'succeeded') break;
  }
  if (p.status !== 'succeeded') throw new Error(`Nano Banana failed: ${p.error || p.detail || p.status}`);
  const url = Array.isArray(p.output) ? p.output[0] : p.output;
  const out = await sharp(Buffer.from(await (await fetch(url)).arrayBuffer())).resize(A.w, A.h, { fit: 'fill' }).removeAlpha().raw().toBuffer();

  // Per-channel gain from the untouched surroundings.
  const sum = [0, 0, 0, 0, 0, 0];
  for (let n = 0; n < A.w * A.h; n++) if (!maskA[n]) for (let c = 0; c < 3; c++) {
    sum[c] += rgb[n * 3 + c];
    sum[c + 3] += out[n * 3 + c];
  }
  const gain = [0, 1, 2].map((c) => (sum[c + 3] ? sum[c] / sum[c + 3] : 1));
  for (let n = 0; n < A.w * A.h; n++) for (let c = 0; c < 3; c++) out[n * 3 + c] = Math.min(255, Math.round(out[n * 3 + c] * gain[c]));
  return out;
}

function undo(history, pub) {
  const stamps = fs.existsSync(history) ? fs.readdirSync(history).filter((s) => /^\d+$/.test(s)).sort() : [];
  const last = stamps.pop();
  if (!last) throw new Error('nothing to undo');
  const dir = path.join(history, last);
  const { id, files } = JSON.parse(fs.readFileSync(path.join(dir, 'files.json'), 'utf8'));
  const boxOf = () => JSON.parse(fs.readFileSync(path.join(pub, '../src/soviet.json'), 'utf8')).slots.flatMap((s) => s.items).find((i) => i.id === id)?.box;
  const from = boxOf();
  for (const f of files) fs.copyFileSync(path.join(dir, path.basename(f)), path.join(pub, f));
  const to = boxOf();
  const grow = from && to && JSON.stringify(from) !== JSON.stringify(to) ? { from, to } : null;
  fs.renameSync(dir, path.join(history, `undone-${last}`));
  return { id, stamp: String(Date.now()), grow };
}
