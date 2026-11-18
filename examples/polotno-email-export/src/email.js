// Runs the email export in the background while you edit. Its warnings feed
// the Audit tab; its HTML feeds the preview, so opening the preview is instant.
import { observable, action, runInAction } from 'mobx';
import { jsonToEmailHTML } from '@polotno/email-export';

// Demo key for this project only. Create your own at https://polotno.com/cabinet
export const KEY = 'HyhTCjrrUThWw9E7dO_y';

export const DESKTOP = 'desktop';
export const MOBILE = 'mobile';

export const email = observable({
  running: false,
  error: null,
  warnings: [],
  html: '',
  // The same HTML with local image URLs, for the preview.
  previewHtml: '',
  images: [],
  // Text elements per page that stayed live / became images.
  stats: { live: 0, image: 0, bytes: 0 },
  previewOpen: false,
  // Theme for new content and blocks (Body tab): fonts and the content
  // background. Body text in a web font often runs wider in Gmail's fallback
  // and is sent as an image; Arial never does.
  theme: { heading: 'Roboto', body: 'Arial', card: '#ffffff' },
});

export const setFont = action((role, family) => (email.theme[role] = family));
export const setCard = action((color) => (email.theme.card = color));

export const openPreview = action(() => (email.previewOpen = true));
export const closePreview = action(() => (email.previewOpen = false));

// A demo has nowhere to host images. Each slice gets a placeholder https URL,
// the address your uploadImage would return, so the HTML and its size are what
// you would send. The bytes stay in memory: the preview swaps in local blob:
// URLs and the download embeds them as data: URLs, so the file opens anywhere.
// Gmail drops data: URLs – in your app, upload the bytes and return the URL.
const HOST = 'https://cdn.example.com/email/';
let slices = new Map(); // placeholder URL → Blob
let blobUrls = [];

// TEMPORARY, until @polotno/email-export ships the fix (branch
// email-export/narrow-client-text): the Gmail iOS app enlarges text ~1.5x, and
// with auto table layout the enlarged lines widened the tables, so Gmail shrank
// the whole email and centred text spilled off the left. Fixed layout keeps
// every table at its designed width. Delete this once the package does it.
const fixTableLayout = (html) =>
  html.replace(/<table\b([^>]*?)style="([^"]*)"/g, (m, attrs, style) =>
    /table-layout/.test(style) ? m : `<table${attrs}style="${style};table-layout:fixed"`
  );

let controller = null;

export async function runExport(store) {
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const warnings = [];
  const uploaded = new Map();
  runInAction(() => (email.running = true));
  try {
    const json = store.toJSON();
    const hasMobile = json.pages.some((p) => p.id === MOBILE);
    const exported = await jsonToEmailHTML(json, {
      key: KEY,
      pageId: DESKTOP,
      mobilePageId: hasMobile ? MOBILE : undefined,
      uploadImage: async ({ bytes, mimeType, name }) => {
        const url = HOST + name;
        uploaded.set(url, new Blob([bytes], { type: mimeType }));
        return url;
      },
      onWarning: (w) => warnings.push(w),
      skipFontError: true,
      skipImageError: true,
      signal,
    });
    if (signal.aborted) return;
    const { images } = exported;
    const html = fixTableLayout(exported.html);
    const texts = json.pages.flatMap((p) => collectTexts(p.children));
    const rasterized = new Set(warnings.filter((w) => w.code === 'text-rasterized').map((w) => w.elementId));
    blobUrls.forEach((u) => URL.revokeObjectURL(u));
    slices = uploaded;
    let previewHtml = html;
    blobUrls = [];
    slices.forEach((blob, url) => {
      const local = URL.createObjectURL(blob);
      blobUrls.push(local);
      previewHtml = previewHtml.split(url).join(local);
    });
    runInAction(() => {
      email.html = html;
      email.previewHtml = previewHtml;
      email.images = images;
      email.warnings = warnings;
      email.error = null;
      email.stats = {
        live: texts.filter((t) => !rasterized.has(t.id)).length,
        image: rasterized.size,
        bytes: new Blob([html]).size,
      };
    });
  } catch (e) {
    if (signal.aborted) return;
    runInAction(() => (email.error = e));
  } finally {
    if (!signal.aborted) runInAction(() => (email.running = false));
  }
}

const collectTexts = (children = []) =>
  children.flatMap((c) => (c.type === 'text' ? [c] : c.type === 'group' ? collectTexts(c.children) : []));

// Re-export after every edit, once the edits settle.
export function watchStore(store) {
  let timer;
  runExport(store);
  return store.on('change', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runExport(store), 700);
  });
}

// The slices of the last export, base64, for the "Send test email" endpoint.
export async function sliceUploads() {
  const out = [];
  for (const [url, blob] of slices) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    out.push({ name: url.slice(HOST.length), data: btoa(bin) });
  }
  return out;
}

const toDataURL = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

export async function downloadHTML() {
  let html = email.html;
  for (const [url, blob] of slices) html = html.split(url).join(await toDataURL(blob));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = 'email.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
