// Replicate calls shared by the pipeline scripts: Nano Banana Pro edits of a
// crop, and two background removers for cutting a piece out of a render.
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import os from 'node:os';

const token = fs.readFileSync(`${os.homedir()}/.config/polotno-remix/token`, 'utf8').trim();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' };

async function settle(p, every) {
  while (p.id && !['succeeded', 'failed', 'canceled'].includes(p.status)) {
    await new Promise((r) => setTimeout(r, every));
    p = await (await fetch(`https://api.replicate.com/v1/predictions/${p.id}`, { headers })).json();
  }
  return p;
}
const output = async (p) => Buffer.from(await (await fetch(Array.isArray(p.output) ? p.output[0] : p.output)).arrayBuffer());

/** Nano Banana Pro: `prompt` applied to the PNG `png`, same aspect; PNG buffer. */
export async function render(prompt, png, resolution = '2K') {
  const input = { prompt, resolution, output_format: 'png', aspect_ratio: 'match_input_image', image_input: ['data:image/png;base64,' + png.toString('base64')] };
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = await settle(await (await fetch('https://api.replicate.com/v1/models/google/nano-banana-pro/predictions', { method: 'POST', headers, body: JSON.stringify({ input }) })).json(), 3000);
    if (p.status === 'succeeded') return output(p);
    console.error('render retry', p.error || p.detail);
  }
  throw new Error('render failed');
}

/** Two background removers on a w×h RGB buffer; returns both alpha masks, w×h. */
export async function segment(rgb, w, h) {
  const image = 'data:image/png;base64,' + (await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer()).toString('base64');
  const one = async (version) => {
    const p = await settle(await (await fetch('https://api.replicate.com/v1/predictions', { method: 'POST', headers, body: JSON.stringify({ version, input: { image } }) })).json(), 2000);
    if (p.status !== 'succeeded') throw new Error(`segmentation failed: ${p.error}`);
    const buf = await output(p);
    const meta = await sharp(buf).metadata();
    return meta.hasAlpha
      ? sharp(buf).resize(w, h, { fit: 'fill' }).ensureAlpha().extractChannel(3).raw().toBuffer()
      : sharp(buf).resize(w, h, { fit: 'fill' }).greyscale().raw().toBuffer();
  };
  return Promise.all([
    one('f74986db0355b58403ed20963af156525e2891ea3c2d499bfbfb2a28cd87c5d7'), // BiRefNet
    one('a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc'), // 851-labs
  ]);
}
