// Server side of the AI render: a small endpoint, POST /api/render, that
// runs image-to-image models on Replicate. It lives in the Vite server so
// the Replicate token stays out of the browser. It reads REPLICATE_API_TOKEN
// from .env.local (gitignored).
//
// Production runs the same models through lib/demo/jewelry-render.ts (the
// /api/demo/jewelry-render route on polotno.com). Change both together.
//
// Request:  { image: dataURL, prompt, model }   model = an id from MODELS
// Response: { url } of the rendered image, or { error }

// The current top image-edit model from each lab, with the fields each one
// expects. The design is 4:3 (40 x 30 mm), so outputs keep that shape.
export const MODELS = {
  'google/nano-banana-pro': (img, prompt) => ({ prompt, image_input: [img], aspect_ratio: 'match_input_image', resolution: '2K', output_format: 'jpg' }),
  'openai/gpt-image-2': (img, prompt) => ({ prompt, input_images: [img], aspect_ratio: '4:3', quality: 'high', output_format: 'jpeg' }),
  'bytedance/seedream-5-pro': (img, prompt) => ({ prompt, image_input: [img], aspect_ratio: 'match_input_image', size: '2K', output_format: 'jpeg' }),
  'black-forest-labs/flux-2-max': (img, prompt) => ({ prompt, input_images: [img], aspect_ratio: 'match_input_image', resolution: '2 MP', output_format: 'jpg' }),
};

const API = 'https://api.replicate.com/v1';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Upload the design to Replicate's file store, so the model gets a URL
// rather than a large inline data URL.
async function uploadImage(token, dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const type = /data:([^;]+)/.exec(meta)?.[1] || 'image/jpeg';
  const form = new FormData();
  form.append('content', new Blob([Buffer.from(b64, 'base64')], { type }), `design.${type.split('/')[1]}`);
  const res = await fetch(`${API}/files`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  return (await res.json()).urls.get;
}

async function runModel(token, model, input) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' };
  let res = await fetch(`${API}/models/${model}/predictions`, { method: 'POST', headers, body: JSON.stringify({ input }) });
  let p = await res.json();
  if (!res.ok) throw new Error(p.detail || `Replicate error ${res.status}`);
  // Slow models outlast the wait: poll until done.
  const started = Date.now();
  while (['starting', 'processing'].includes(p.status) && Date.now() - started < 180000) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(p.urls.get, { headers });
    p = await res.json();
  }
  if (p.status !== 'succeeded') throw new Error(p.error || `Render ${p.status}`);
  return Array.isArray(p.output) ? p.output[0] : p.output;
}

export function renderProxy(token) {
  const handler = async (req, res, next) => {
    if (req.url !== '/api/render' || req.method !== 'POST') return next();
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    try {
      if (!token) return send(500, { error: 'REPLICATE_API_TOKEN is not set in .env.local' });
      const { image, prompt, model } = JSON.parse(await readBody(req));
      const build = MODELS[model];
      if (!build) return send(400, { error: `Unknown model ${model}` });
      const url = await runModel(token, model, build(await uploadImage(token, image), prompt));
      send(200, { url });
    } catch (err) {
      console.error('[render]', err);
      send(502, { error: err.message || 'Render failed' });
    }
  };
  return {
    name: 'jewelry-render-proxy',
    // Block bodies on purpose: Vite runs a function returned from these hooks.
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
