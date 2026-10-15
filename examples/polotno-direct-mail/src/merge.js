// Turning the template plus one donor record into that donor's piece.
//
// This runs on the design JSON, not on the canvas, so the same function serves
// the on-screen proof and the batch export. On a server it would run unchanged
// before handing each design to the renderer.

import QRCode from 'qrcode';
import { ORG, deriveFields, fillTokens, findTokens } from './campaign.js';
import { coverCrop } from './templates.js';

const svgUrl = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// --- text fitting --------------------------------------------------------

// Long values are the normal case in a donor file, so each text that holds
// one carries a rule: shrink until it fits its box, never below `min`. It is
// measured here with the same font the canvas uses, so the decision is the
// same for every donor whether or not anyone ever looks at their proof.

const ctx = document.createElement('canvas').getContext('2d');
const fontLoads = new Map();

const fontString = (el, size) =>
  `${el.fontStyle || 'normal'} ${el.fontWeight || 'normal'} ${size}px "${el.fontFamily}"`;

function ensureFont(el) {
  const key = `${el.fontFamily}|${el.fontWeight}|${el.fontStyle}`;
  if (!fontLoads.has(key)) fontLoads.set(key, document.fonts.load(fontString(el, 40)).catch(() => []));
  return fontLoads.get(key);
}

function measure(el, str, size) {
  ctx.font = fontString(el, size);
  const spacing = (el.letterSpacing || 0) * size * str.length;
  return ctx.measureText(str).width + spacing;
}

// Greedy wrap, breaking at spaces and after hyphens, the way the canvas does:
// "Montgomery-Fitzgerald" can end one line at "Montgomery-".
function wrap(el, str, size) {
  const lines = [];
  let widest = 0;
  for (const para of str.split('\n')) {
    const parts = para.split(' ').flatMap((w, i) => w.split(/(?<=-)/).map((text, j) => ({ text, gap: i > 0 && j === 0 ? ' ' : '' })));
    let line = '';
    for (const { text, gap } of parts) {
      widest = Math.max(widest, measure(el, text, size));
      const next = line ? `${line}${gap}${text}` : text;
      if (line && measure(el, next, size) > el.width) {
        lines.push(line);
        line = text;
      } else line = next;
    }
    lines.push(line);
  }
  return { lines, widest };
}

function fits(el, str, size, mode) {
  const shown = el.textTransform === 'uppercase' ? str.toUpperCase() : str;
  const lineHeight = typeof el.lineHeight === 'number' ? el.lineHeight : 1.2;
  // The box as it is now: resizing it in the editor changes what fits.
  const maxHeight = el.height;
  if (mode === 'lines') {
    // Address lines may not wrap: a wrapped line is a different address.
    const rows = shown.split('\n');
    return (
      rows.every((r) => measure(el, r, size) <= el.width) &&
      rows.length * size * lineHeight <= maxHeight + 1
    );
  }
  const { lines, widest } = wrap(el, shown, size);
  return widest <= el.width && lines.length * size * lineHeight <= maxHeight + 1;
}

const toPt = (px) => Math.round((px * 72 * 10) / 300) / 10;

function fitText(el, str) {
  const { mode, min } = el.custom.fit;
  const start = el.fontSize;
  const step = 300 / 72 / 4; // a quarter point
  let size = start;
  while (size > min && !fits(el, str, size, mode)) size -= step;
  size = Math.max(size, min);
  return { size, ok: fits(el, str, size, mode), changed: size < start - 0.01 };
}

// --- codes ---------------------------------------------------------------

export const giveUrl = (donorId) => `${ORG.giveUrl}?donor=${encodeURIComponent(donorId)}`;

async function qrSrc(donorId) {
  const svg = await QRCode.toString(giveUrl(donorId), {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    // An explicit size: without one the PDF renderer has to guess the SVG's.
    width: 400,
    color: { dark: '#1C1C1A', light: '#FFFFFF' },
  });
  return svgUrl(svg);
}

// --- merge ---------------------------------------------------------------

const forEachElement = (nodes, cb) =>
  nodes.forEach((n) => {
    cb(n);
    if (n.children) forEachElement(n.children, cb);
  });

/**
 * Fill a template for one donor.
 *
 * Returns the filled design plus everything the proof reports about it: which
 * rules fired, which texts were shrunk, and any {{field}} the list could not
 * fill.
 */
export async function mergeDonor(template, donor, campaign, { overlays = true } = {}) {
  const { values, segment, asks, photo, notes } = deriveFields(donor, campaign);
  const json = structuredClone(template);
  const fitNotes = [];
  const unfilled = new Set();
  const jobs = [];

  json.pages.forEach((page) => {
    if (!overlays) page.children = page.children.filter((el) => !el.custom?.overlay);
    forEachElement(page.children, (el) => {
      el.selectable = false;
      if (el.type === 'text' && typeof el.text === 'string' && el.text.includes('{{')) {
        let str = fillTokens(el.text, values);
        findTokens(str).forEach((k) => unfilled.add(k));
        if (el.custom?.collapseEmptyLines) str = str.split('\n').filter((l) => l.trim()).join('\n');
        el.text = str;
        if (el.custom?.fit) {
          jobs.push(
            ensureFont(el).then(() => {
              const from = el.fontSize;
              const r = fitText(el, str);
              el.fontSize = r.size;
              if (!r.ok) fitNotes.push({ level: 'warn', text: `${el.name} doesn't fit even at its ${toPt(r.size)} pt minimum` });
              else if (r.changed) fitNotes.push({ level: 'note', text: `${el.name} shrunk from ${toPt(from)} to ${toPt(r.size)} pt to fit` });
            })
          );
        }
      }
      const v = el.custom?.variable;
      if (v === 'segment_photo' && photo) {
        Object.assign(el, { src: photo.src }, coverCrop(el.width, el.height, photo.width, photo.height));
      } else if (v === 'qr') {
        jobs.push(qrSrc(values.donor_id).then((src) => (el.src = src)));
      }
    });
  });

  await Promise.all(jobs);
  return { json, values, segment, asks, notes, fitNotes, unfilled: [...unfilled] };
}

/**
 * One design holding every donor's pages, in list order, ready for a single
 * PDF. Ids are made unique per donor so the pages can share a document.
 */
export function combine(merged) {
  const [first] = merged;
  return {
    ...first.json,
    pages: merged.flatMap((m, i) =>
      m.json.pages.map((p) => {
        const page = structuredClone(p);
        page.id = `${p.id}-d${i}`;
        forEachElement(page.children, (el) => (el.id = `${el.id}-d${i}`));
        return page;
      })
    ),
  };
}
