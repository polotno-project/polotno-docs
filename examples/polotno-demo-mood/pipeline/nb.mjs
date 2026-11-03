// Nano Banana Pro on Replicate: prompt + reference images -> 2496x1664 PNG.
import sharp from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import os from 'node:os';
const token = fs.readFileSync(os.homedir() + '/.config/polotno-remix/token', 'utf8').trim();
export const W = +(process.env.W || 2496), H = +(process.env.H || 1664);
const toData = async (file) => {
  const buf = await sharp(file).resize(1600, 1600, { fit: 'inside' }).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
  return 'data:image/jpeg;base64,' + buf.toString('base64');
};
export async function nb(prompt, images, out, aspect = '3:2') {
  const t0 = Date.now();
  const input = { prompt, resolution: process.env.RES || '2K', output_format: 'png', aspect_ratio: aspect };
  if (images.length) input.image_input = await Promise.all(images.map(toData));
  for (let attempt = 0; attempt < 3; attempt++) {
    let res = await fetch('https://api.replicate.com/v1/models/google/nano-banana-pro/predictions', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' },
      body: JSON.stringify({ input }),
    });
    let p = await res.json();
    while (p.id && !['succeeded', 'failed', 'canceled'].includes(p.status)) {
      await new Promise((r) => setTimeout(r, 3000));
      p = await (await fetch(`https://api.replicate.com/v1/predictions/${p.id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
    }
    if (p.status === 'succeeded') {
      const url = Array.isArray(p.output) ? p.output[0] : p.output;
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      await sharp(buf).resize(W, H, { fit: 'fill' }).png().toFile(out);
      console.log(out.split('/').pop(), Math.round((Date.now() - t0) / 1000) + 's');
      return out;
    }
    console.log('retry', out.split('/').pop(), p.error || p.detail);
  }
  throw new Error('failed ' + out);
}
