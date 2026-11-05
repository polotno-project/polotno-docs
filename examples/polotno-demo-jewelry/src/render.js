// AI render: the flat top view goes to an image-to-image model with a
// prompt, and comes back as a photo.
//
// The models run on Replicate through a server endpoint that holds the
// token: render-proxy.js in dev, /api/demo/jewelry-render on polotno.com for
// the private version. The public build has no endpoint (see ai.js).

import { observable, runInAction } from 'mobx';
import { describe, designData } from './parts.js';
import { withSolidBackground } from './theme.js';

export const POLOTNO_KEY = 'HyhTCjrrUThWw9E7dO_y';
import { AI } from './ai.js';

// Every scene keeps the design itself fixed and changes only the shot. The
// stones are named outright: asked to "keep the colours", the model tends to
// invent coloured side stones.
const STONE_NAMES = { diamond: 'colourless white diamonds', ruby: 'red rubies', sapphire: 'blue sapphires', emerald: 'green emeralds', amethyst: 'purple amethysts', morganite: 'pale pink morganites' };
function keepClause(store) {
  const stones = [...new Set(designData(store).filter((i) => i.stone).map((i) => i.stone))];
  const named = stones.length === 1 ? `All stones are ${STONE_NAMES[stones[0]]}.` : stones.length ? `The stones are ${stones.map((s) => STONE_NAMES[s]).join(' and ')}, each exactly where the input shows it.` : '';
  return `Keep the exact design from the input image: the same band shape, the same stones in the same cuts, sizes and positions, and the same metal. ${named} Do not add, remove or recolour any stone.`;
}

export const SCENES = [
  {
    id: 'studio',
    label: 'Studio, top view',
    prompt: (d, k) => `Professional jewelry product photograph of ${d}, seen from directly above, lying on a clean white seamless background. Soft studio lighting, crisp reflections in polished metal, brilliant sparkle in the stones, sharp focus. ${k}`,
  },
  {
    id: 'angle',
    label: 'Angled view',
    prompt: (d, k) => `Professional jewelry product photograph of ${d}, standing upright and turned to a three-quarter angle so the profile of the band and the height of the settings show. Light grey studio background, soft reflections, sharp focus. ${k}`,
  },
  {
    id: 'hand',
    label: 'On a hand',
    prompt: (d, k) => `Close-up lifestyle photograph of ${d}, worn on the ring finger of a woman's hand, natural daylight, soft background blur, realistic skin. ${k}`,
  },
  {
    id: 'velvet',
    label: 'Dark velvet',
    prompt: (d, k) => `Luxury jewelry photograph of ${d}, seen from above, resting on deep navy velvet, dramatic soft light from the top left, rich reflections and sparkle. ${k}`,
  },
];

// Image-to-image models on Replicate, in the order offered. The ids match
// render-proxy.js, which maps each to its own input fields.
export const MODELS = [
  { id: 'google/nano-banana-pro', label: 'Nano Banana Pro', vendor: 'Google', note: 'Most natural and most faithful to the design. About 30 s.' },
  { id: 'openai/gpt-image-2', label: 'GPT Image 2', vendor: 'OpenAI', note: 'Clean catalogue look, true to the design. About a minute.' },
  { id: 'bytedance/seedream-5-pro', label: 'Seedream 5 Pro', vendor: 'ByteDance', note: 'Glossy, high-contrast look at 2K. Slow: up to 3 minutes.' },
  { id: 'black-forest-labs/flux-2-max', label: 'Flux 2 Max', vendor: 'Black Forest Labs', note: 'Fast, but adds sparkle effects and textured backgrounds.' },
];
export const modelById = (id) => MODELS.find((m) => m.id === id) || MODELS[0];

// "Custom" is the user's own prompt. It isn't in SCENES because nothing
// writes it: it keeps whatever the user typed.
export const CUSTOM = { id: 'custom', label: 'Custom' };
export const sceneLabel = (id) => (id === CUSTOM.id ? CUSTOM.label : SCENES.find((s) => s.id === id)?.label);

export const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];
export const promptFor = (store, sceneId) => sceneById(sceneId).prompt(describe(store), keepClause(store));

// Render state lives outside the panel, so results survive switching tabs.
export const renders = observable({
  running: 0,
  error: '',
  results: [], // { id, src, scene, prompt }
});


async function renderImage(imageDataUrl, prompt, modelId) {
  const res = await fetch(AI.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(AI.key ? { 'X-Demo-Key': AI.key } : {}) },
    body: JSON.stringify({ image: imageDataUrl, prompt, model: modelId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.url !== 'string') {
    throw Object.assign(new Error(data.error || `Render failed (HTTP ${res.status})`), {
      userMessage: data.error ? `Render failed: ${data.error}` : undefined,
    });
  }
  return data.url;
}

// The model gets the design about 1100 px wide, as a JPEG: enough detail for
// small stones, small enough to upload fast.
async function snapshot(store) {
  return withSolidBackground(store, () => store.toDataURL({ pixelRatio: 1100 / store.width, mimeType: 'image/jpeg', quality: 0.92 }));
}

// `models` is a list of model ids; each gets `count` renders. Picking both
// models puts their results side by side.
export async function runRenders(store, { sceneId, prompt, count, models }) {
  const jobsList = models.flatMap((m) => Array.from({ length: count }, () => m));
  runInAction(() => {
    renders.running += jobsList.length;
    renders.error = '';
  });
  const image = await snapshot(store);
  const jobs = jobsList.map(async (modelId) => {
    try {
      const src = await renderImage(image, prompt, modelId);
      runInAction(() => {
        renders.results.unshift({ id: Math.random().toString(36).slice(2), src, scene: sceneId, model: modelId, prompt });
      });
    } catch (err) {
      console.error(err);
      runInAction(() => {
        renders.error = err.userMessage || 'A render failed. Try again in a moment.';
      });
    } finally {
      runInAction(() => {
        renders.running -= 1;
      });
    }
  });
  await Promise.all(jobs);
}
