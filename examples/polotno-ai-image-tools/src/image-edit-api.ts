import {
  setExpandFunc,
  setRemoveBackgroundEnabled,
  setRemoveObjectFunc,
  setReplaceObjectFunc,
  setUpscaleFunc,
} from 'polotno/config';
import type { ImageEditResult } from 'polotno/config';
import { padImageForFrame, prepareImageInput } from 'polotno/utils/image-edit';

// Polotno's rate-limited demo backend. Point this at your own server, or at a
// local dev server, to use your own provider and keys.
export const IMAGE_EDIT_API = 'https://api.polotno.com/api/ai/demo/image-edit';

type Operation = 'expand' | 'replace' | 'remove' | 'upscale';

const RATE_LIMIT_MESSAGE =
  'The demo allows 20 AI edits per day. Please try again tomorrow.';

async function editImage(
  operation: Operation,
  fields: { image: Blob; mask?: Blob; prompt?: string },
  signal: AbortSignal,
): Promise<ImageEditResult> {
  const body = new FormData();
  body.append('image', fields.image, 'image.png');
  if (fields.mask) body.append('mask', fields.mask, 'mask.png');
  if (fields.prompt?.trim()) body.append('prompt', fields.prompt.trim());

  // Passing `signal` cancels the upload when the user cancels the edit. The
  // resulting AbortError tells Polotno to end the run without an error message.
  const response = await fetch(`${IMAGE_EDIT_API}/${operation}`, {
    method: 'POST',
    body,
    signal,
  });
  const data: { url?: unknown; error?: unknown } | null = await response
    .json()
    .catch(() => null);
  if (response.status === 429) {
    // Polotno shows `userMessage` in its stock UI instead of the generic text.
    throw Object.assign(new Error('Image edit rate limit reached.'), {
      userMessage: RATE_LIMIT_MESSAGE,
    });
  }
  if (!response.ok || typeof data?.url !== 'string') {
    const reason = typeof data?.error === 'string' ? data.error : 'bad response';
    throw new Error(`Image ${operation} failed (HTTP ${response.status}): ${reason}`);
  }
  // The backend returns a durable URL that allows cross-origin loading.
  return { src: data.url };
}

export function registerImageTools() {
  // Expand gets the current view of the image plus the frame to fill. Fit the
  // padded result inside the provider limit first, then pad it: the new area
  // is white in the mask, the original pixels are black.
  setExpandFunc(async ({ image, size, frame, prompt, signal }) => {
    const prepared = await prepareImageInput({ image, size, frame });
    const padded = await padImageForFrame(prepared);
    return editImage(
      'expand',
      { image: padded.image, mask: padded.mask, prompt },
      signal,
    );
  });

  // Generative fill. Polotno's mask is already white = edit, black = keep,
  // which is the convention this backend expects, so no formatMask() call.
  setReplaceObjectFunc(({ image, mask, prompt, signal }) =>
    editImage('replace', { image, mask, prompt }, signal),
  );
  setRemoveObjectFunc(({ image, mask, signal }) =>
    editImage('remove', { image, mask }, signal),
  );

  setUpscaleFunc(({ image, signal }) => editImage('upscale', { image }, signal));

  // Background removal keeps the built-in Polotno Cloud handler.
  setRemoveBackgroundEnabled(true);
}
