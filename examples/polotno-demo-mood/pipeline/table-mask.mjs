// The side table and its plant, cut out of the empty room, as a full-size mask.
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import os from 'node:os';
const token = fs.readFileSync(os.homedir() + '/.config/polotno-remix/token', 'utf8').trim();
const W = 3840, H = 2560, R = { left: 700, top: 700, width: 900, height: 900 };
const crop = await sharp('empty.png').resize(W, H, { fit: 'fill' }).extract(R).png().toBuffer();
const api = async (path, body) => (await fetch(`https://api.replicate.com/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' }, body: body && JSON.stringify(body) })).json();
let p = await api('predictions', { version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc', input: { image: 'data:image/png;base64,' + crop.toString('base64') } });
const t0 = Date.now();
while (!['succeeded', 'failed', 'canceled'].includes(p.status)) { if (Date.now() - t0 > 120000) throw new Error('timeout ' + p.status); await new Promise((r) => setTimeout(r, 2000)); p = await api(`predictions/${p.id}`); }
const buf = Buffer.from(await (await fetch(Array.isArray(p.output) ? p.output[0] : p.output)).arrayBuffer());
const meta = await sharp(buf).metadata();
const m = meta.hasAlpha ? await sharp(buf).resize(R.width, R.height).ensureAlpha().extractChannel(3).png().toBuffer() : await sharp(buf).resize(R.width, R.height).greyscale().png().toBuffer();
await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } }).composite([{ input: m, left: R.left, top: R.top }]).extractChannel(0).png().toFile('table-mask.png');
await sharp(m).resize(300).png().toFile('table-mask-small.png');
console.log('ok');
