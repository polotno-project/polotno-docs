import {
  setExpandFunc,
  setRemoveBackgroundFunc,
  setRemoveObjectFunc,
  setReplaceObjectFunc,
  setUpscaleFunc,
} from 'polotno/config';
import type { ImageEditResult } from 'polotno/config';
import { prepareImageInput } from 'polotno/utils/image-edit';

// this is a demo key just for that project
// (!) please don't use it in your projects
// to create your own API key please go here: https://polotno.com/cabinet
export const POLOTNO_KEY = 'nFA5H9elEytDyPyvKL7T';

// Polotno's AI endpoints. They run this demo on polotno.com under a daily
// limit. In your app, point the handlers at your own provider instead.
const API = 'https://api.polotno.com/api';

type Tool = 'expand' | 'replace' | 'remove' | 'upscale';

// Keep it short: the stock UI shows it in a one-line status chip.
const RATE_LIMIT_MESSAGE = 'Daily demo limit reached. Try tomorrow.';

// Keeps uploads small, and 2x upscale within the endpoint's 4096 px output.
const MAX_SIDE = 2048;

async function readResult(response: Response, tool: string): Promise<string> {
  if (response.status === 429) {
    // Polotno shows `userMessage` in its stock UI instead of the generic text.
    throw Object.assign(new Error('Image edit rate limit reached.'), {
      userMessage: RATE_LIMIT_MESSAGE,
    });
  }
  if (!response.ok) {
    // Polotno shows its generic failure message for errors without userMessage.
    const reason = await response.text().catch(() => '');
    throw new Error(`Image ${tool} failed (HTTP ${response.status}): ${reason}`);
  }
  const data: { src?: unknown; url?: unknown } = await response.json();
  const src = data.src ?? data.url;
  if (typeof src !== 'string') {
    throw new Error(`Image ${tool} failed: bad response`);
  }
  // The endpoints answer a data URL. A production adapter usually stores the
  // result and returns a durable, CORS-enabled URL, so designs do not embed
  // large images.
  return src;
}

async function runTool(
  tool: Tool,
  fields: { image: Blob; mask?: Blob; prompt?: string; frame?: object },
  signal: AbortSignal,
): Promise<ImageEditResult> {
  const body = new FormData();
  body.append('image', fields.image, 'image.png');
  if (fields.mask) body.append('mask', fields.mask, 'mask.png');
  if (fields.prompt?.trim()) body.append('prompt', fields.prompt.trim());
  if (fields.frame) body.append('frame', JSON.stringify(fields.frame));

  // Passing `signal` cancels the upload when the user cancels the edit. The
  // resulting AbortError tells Polotno to end the run without an error message.
  const response = await fetch(`${API}/ai/tools/${tool}?KEY=${POLOTNO_KEY}`, {
    method: 'POST',
    body,
    signal,
  });
  return { src: await readResult(response, tool) };
}

export function registerImageTools() {
  // Expand gets the current view of the image plus the frame to fill, as a
  // rect normalized to the image. The endpoint pads the image itself, so it
  // takes the image as is. The size cap covers the whole expanded canvas.
  setExpandFunc(async ({ image, size, frame, prompt, signal }) => {
    const prepared = await prepareImageInput(
      { image, size, frame },
      { maxSide: MAX_SIDE },
    );
    return runTool('expand', { image: prepared.image, frame, prompt }, signal);
  });

  // Generative fill. Polotno's mask is already white = edit, black = keep,
  // which is the convention the endpoint expects, so no formatMask() call.
  // prepareImageInput resizes the image and its mask together.
  setReplaceObjectFunc(async ({ image, size, mask, prompt, signal }) => {
    const input = await prepareImageInput(
      { image, size, mask },
      { maxSide: MAX_SIDE },
    );
    return runTool('replace', { ...input, prompt }, signal);
  });
  setRemoveObjectFunc(async ({ image, size, mask, signal }) => {
    const input = await prepareImageInput(
      { image, size, mask },
      { maxSide: MAX_SIDE },
    );
    return runTool('remove', input, signal);
  });

  setUpscaleFunc(async ({ image, size, signal }) => {
    const input = await prepareImageInput({ image, size }, { maxSide: MAX_SIDE });
    return runTool('upscale', input, signal);
  });

  // Background removal gets the image's source URL, not pixels. A custom
  // handler shows the menu entry whatever the key's Cloud plan includes.
  setRemoveBackgroundFunc(async (src, signal) => {
    const response = await fetch(
      `${API}/remove-image-background?KEY=${POLOTNO_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: src }),
        signal,
      },
    );
    return readResult(response, 'background removal');
  });
}
