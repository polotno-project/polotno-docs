import { getImageSize } from 'polotno/utils/image';
import { getClientRect } from 'polotno/utils/math';
import { getFontsList, globalFonts } from 'polotno/utils/fonts';

import { PRODUCT, mmToPx, pxToMm, pxToPt, ptToPx, round1 } from './spec.js';

/**
 * A print pre-press check run against a live Polotno store.
 *
 * Everything here reads the design the editor already holds — `store.toJSON()`
 * fields plus three helpers Polotno exports (`getImageSize`, `getClientRect`,
 * `getFontsList`). There is no separate document model and no server
 * round-trip.
 *
 * The file-side counterpart of this engine lives in the website repo at
 * `lib/tools/preflight/` (the checker on polotno.com/tools/pdf-preflight).
 * Shared wording is kept identical on purpose — a customer who runs both
 * should read one product, not two. Keep them in step.
 *
 * House rule, borrowed from that engine: never fail a file on a guess. Where a
 * check genuinely cannot know something it returns `unknown` and says so,
 * rather than inventing a verdict. A preflight that cries wolf gets switched
 * off, and one that gives false comfort is worse — a print run costs real
 * money.
 *
 * Statuses:
 *   fail    — a printer will reject or misprint this
 *   warn    — check it against your printer's spec
 *   note    — determined, not a defect, you should know
 *   unknown — could not be determined; do not read as a pass
 *   pass    — checked and clean
 */

// Cache image dimensions by src. Validation re-runs on every store change and
// getImageSize does a network fetch.
const imageSizeCache = new Map();

function cachedImageSize(src) {
  if (!imageSizeCache.has(src)) {
    imageSizeCache.set(
      src,
      getImageSize(src).catch(() => null)
    );
  }
  return imageSizeCache.get(src);
}

// --- wording helpers --------------------------------------------------------

/** "1 image" / "3 images". Every row needs it; none should spell it out. */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The worst offender in a bucket, by whatever measure the row reports on. */
const minBy = (arr, f) => arr.reduce((a, b) => (f(a) < f(b) ? a : b));

/**
 * How a row refers to an element. One rule, so two rows about the same
 * unnamed shape do not call it two different things.
 */
const label = (el) => el.name || el.type;

// --- colour helpers ---------------------------------------------------------

function parseColor(color) {
  if (typeof color !== 'string') return null;
  const hex = color.trim();
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  if (m3) {
    return {
      r: parseInt(m3[1] + m3[1], 16),
      g: parseInt(m3[2] + m3[2], 16),
      b: parseInt(m3[3] + m3[3], 16),
      a: 1,
    };
  }
  const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m6) {
    return {
      r: parseInt(m6[1], 16),
      g: parseInt(m6[2], 16),
      b: parseInt(m6[3], 16),
      a: 1,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(hex);
  if (rgb) {
    const parts = rgb[1].split(',').map((p) => parseFloat(p));
    if (parts.length >= 3) {
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length > 3 ? parts[3] : 1,
      };
    }
  }
  // Gradients and named colours: we do not pretend to resolve them.
  return null;
}

function relativeLuminance({ r, g, b }) {
  const chan = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function saturation({ r, g, b }) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return { s: 0, l };
  const d = max - min;
  return { s: l > 0.5 ? d / (2 - max - min) : d / (max + min), l };
}

// --- geometry helpers -------------------------------------------------------

function collect(page) {
  const out = [];
  const walk = (children) => {
    children.forEach((el) => {
      out.push(el);
      if (el.type === 'group' && el.children) walk(el.children);
    });
  };
  walk(page.children);
  return out;
}

function rectOf(element) {
  return getClientRect(element);
}

const contains = (outer, inner) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

/**
 * The solid colour sitting behind an element, or null when we cannot tell.
 *
 * Walks down the z-order from the element and stops at the first thing that
 * covers it. If that thing is an image, a gradient, or semi-transparent, the
 * answer is null — an honest "cannot determine" rather than a contrast number
 * computed against a colour nobody is actually looking at.
 */
function backdropOf(element, elements, page) {
  const rect = rectOf(element);
  const index = elements.indexOf(element);
  for (let i = index - 1; i >= 0; i--) {
    const below = elements[i];
    if (below.visible === false) continue;
    const belowRect = rectOf(below);
    if (!contains(belowRect, rect)) continue;
    if (below.type === 'image' || below.type === 'svg' || below.type === 'video')
      return null;
    if (below.opacity < 1) return null;
    const parsed = parseColor(below.fill);
    if (!parsed || parsed.a < 1) return null;
    return parsed;
  }
  return parseColor(page.background);
}

/** Every colour on an element that actually gets inked. */
function inkedColors(el) {
  // Polotno gives every figure a default `stroke` (its UI blue) with
  // `strokeWidth: 0`, and every text a default black stroke — reading those
  // would flag colours nobody can see.
  return [
    el.type === 'line' ? el.color : el.fill,
    el.strokeWidth > 0 ? el.stroke : null,
  ].filter((c) => typeof c === 'string' && c && c !== 'transparent');
}

// --- the rules --------------------------------------------------------------

/**
 * Every check, as data. One descriptor per rule, readable in one place —
 * rather than split across an accumulator, a detection branch, and a report
 * block two hundred lines apart.
 *
 * Two kinds:
 *
 *   scope: 'document'   `run(ctx)` returns the row. For checks about the page
 *                       itself, where the clean and broken cases read
 *                       differently enough to be worth writing out.
 *
 *   scope: 'element'    `match(el, ctx)` returns a hit or a falsy value. The
 *                       engine offers every printing element and gathers the
 *                       hits, then asks the rule to word one row about them.
 *
 * An element rule may also declare:
 *
 *   worst   which hit the row should talk about; lowest wins. Defaults to the
 *           first hit found.
 *   pass    the row to show when nothing matched. A rule with no `pass` stays
 *           silent instead — see `gradient-colour`, which exists to disclose a
 *           gap in coverage and has nothing to say when there is no gap.
 *   fix     `(hits, ctx)` returning a repair function, or null when the design
 *           cannot honestly be repaired from here.
 *   on      'excluded' to be offered the elements that will not print, rather
 *           than the ones that will.
 *
 * Adding a check means adding a descriptor. Turning one off for a given SKU
 * means filtering this array — which is what a catalogue record would drive in
 * a real integration.
 */
export const RULES = [
  {
    id: 'trim-size',
    scope: 'document',
    run: ({ store, page }) => {
      const wMm = pxToMm(page.computedWidth ?? store.width, store.dpi);
      const hMm = pxToMm(page.computedHeight ?? store.height, store.dpi);
      const ok =
        Math.abs(wMm - PRODUCT.widthMm) < 0.5 &&
        Math.abs(hMm - PRODUCT.heightMm) < 0.5;
      return {
        status: ok ? 'pass' : 'fail',
        title: ok
          ? `Trim size matches ${PRODUCT.name}`
          : 'Trim size does not match the product',
        detail: ok
          ? `${round1(wMm)} × ${round1(hMm)} mm, as ordered.`
          : `The design is ${round1(wMm)} × ${round1(hMm)} mm; ${PRODUCT.name} is ${PRODUCT.widthMm} × ${PRODUCT.heightMm} mm. Resizing a finished layout stretches the artwork, so rebuild at the right size.`,
      };
    },
  },

  {
    id: 'working-dpi',
    scope: 'document',
    // The Polotno default is 72, which is a screen number.
    run: ({ store }) => {
      const ok = store.dpi >= PRODUCT.dpi;
      return {
        status: ok ? 'pass' : 'fail',
        title: ok
          ? `Working resolution ${store.dpi} DPI`
          : `Working resolution is ${store.dpi} DPI`,
        detail: ok
          ? 'Measurements convert to physical units correctly.'
          : `The document is still at the screen default. Every physical measurement below (type size, bleed, hairlines) is computed from this number, so set it to ${PRODUCT.dpi} before reading the rest of this report.`,
        fix: ok ? null : () => store.setUnit({ unit: 'mm', dpi: PRODUCT.dpi }),
        fixLabel: `Set ${PRODUCT.dpi} DPI`,
      };
    },
  },

  {
    id: 'bleed',
    scope: 'document',
    run: ({ store, page, printing, pageW, pageH }) => {
      const bleedMm = pxToMm(page.bleed || 0, store.dpi);
      if (bleedMm >= PRODUCT.bleedMm - 0.1) {
        return {
          status: 'pass',
          title: `Bleed ${round1(bleedMm)} mm`,
          detail:
            'Artwork extends past the trim line, so cuts will not leave white slivers.',
        };
      }
      // Bleed is only a defect when something actually reaches the edge.
      const atEdge = printing.filter((el) => {
        const r = rectOf(el);
        return (
          r.x <= 1 ||
          r.y <= 1 ||
          r.x + r.width >= pageW - 1 ||
          r.y + r.height >= pageH - 1
        );
      });
      if (!atEdge.length) {
        return {
          status: 'note',
          title: 'No bleed, and nothing runs to the edge',
          detail:
            'Every element sits inside the trim, so this design does not need bleed. Judge by the layout, not the rule.',
        };
      }
      return {
        status: 'fail',
        title: bleedMm <= 0.1 ? 'No bleed' : `Bleed under ${PRODUCT.bleedMm} mm`,
        detail: `"${label(atEdge[0])}" runs to the page edge but there is ${round1(bleedMm)} mm past the trim line. Guillotines drift by up to a millimetre; without bleed that drift shows as a white sliver down the edge.`,
        elementId: atEdge[0].id,
        fix: () => page.set({ bleed: Math.ceil(mmToPx(PRODUCT.bleedMm, store.dpi)) }),
        fixLabel: `Add ${PRODUCT.bleedMm} mm bleed`,
      };
    },
  },

  {
    id: 'image-dpi',
    scope: 'element',
    status: 'fail',
    match: (el, { sizeOf, store }) => {
      if (el.type !== 'image' || !el.src) return null;
      const size = sizeOf(el.src);
      if (!size || !size.width) return null;
      const placedInches = el.width / store.dpi;
      if (placedInches <= 0) return null;
      const effective = (size.width * (el.cropWidth ?? 1)) / placedInches;
      return effective < PRODUCT.minImageDpi
        ? { el, effective: Math.round(effective) }
        : null;
    },
    worst: (h) => h.effective,
    title: ({ hits }) => `${plural(hits.length, 'image')} below ${PRODUCT.minImageDpi} DPI`,
    detail: ({ worst }) =>
      `The weakest is "${label(worst.el)}" at ${worst.effective} DPI where it sits on the page. On a screen that looks fine; on paper it is visibly soft. Upscaling cannot fix this. The file has to be swapped for a larger original.`,
    // Resolution is the one problem no amount of maths fixes — the pixels are
    // not there. All a fix button can honestly do is fetch the print master,
    // if your asset record knows about one.
    fix: ({ hits }) => {
      const withMaster = hits.filter((h) => h.el.custom?.printMasterSrc);
      return withMaster.length
        ? () => withMaster.forEach(({ el }) => el.set({ src: el.custom.printMasterSrc }))
        : null;
    },
    fixLabel: 'Fetch print master',
    pass: {
      title: 'Image resolution',
      detail: `Every placed image resolves at ${PRODUCT.minImageDpi} DPI or better at its size on the page.`,
    },
  },

  {
    id: 'fonts',
    scope: 'element',
    status: 'fail',
    match: (el, { availableFonts }) =>
      el.type === 'text' && !availableFonts.has(el.fontFamily) ? { el } : null,
    title: ({ hits }) => {
      const families = [...new Set(hits.map((h) => h.el.fontFamily))];
      return families.length === 1
        ? `Font not available: ${families[0]}`
        : `${plural(families.length, 'font')} not available`;
    },
    detail: ({ hits }) =>
      `${plural(hits.length, 'text element')} ask${hits.length === 1 ? 's' : ''} for a font this editor cannot load, so it is being substituted on screen and would be substituted again at the RIP. Line breaks and spacing will not match what you see.`,
    fix: ({ hits }) => () =>
      hits.forEach(({ el }) => el.set({ fontFamily: PRODUCT.substituteFont })),
    fixLabel: `Substitute ${PRODUCT.substituteFont}`,
    pass: {
      title: 'Font availability',
      detail: 'Every typeface in the design is one this editor can load and embed.',
    },
  },

  {
    id: 'type-size',
    scope: 'element',
    status: 'fail',
    match: (el, { store }) => {
      if (el.type !== 'text') return null;
      const pt = pxToPt(el.fontSize, store.dpi);
      return pt < PRODUCT.minTypePt ? { el, pt } : null;
    },
    worst: (h) => h.pt,
    title: () => `Type below ${PRODUCT.minTypePt} pt`,
    detail: ({ worst }) =>
      `"${label(worst.el)}" is set at ${round1(worst.pt)} pt. Under ${PRODUCT.minTypePt} pt, ink spread on uncoated stock closes up the counters and the line turns to mush.`,
    fix: ({ hits, store }) => () =>
      hits.forEach(({ el }) =>
        el.set({ fontSize: Math.ceil(ptToPx(PRODUCT.minTypePt, store.dpi)) })
      ),
    fixLabel: `Raise to ${PRODUCT.minTypePt} pt`,
    pass: {
      title: 'Type size',
      detail: `Every text element is ${PRODUCT.minTypePt} pt or larger.`,
    },
  },

  {
    id: 'safety-margin',
    scope: 'element',
    status: 'warn',
    // Type near the cut is a different problem from art near the cut: art is
    // usually meant to bleed, words never are.
    match: (el, { pageW, pageH, safetyPx, outsideTrim }) => {
      if (el.type !== 'text' || outsideTrim(el)) return null;
      const r = rectOf(el);
      const inset = Math.min(
        r.x,
        r.y,
        pageW - (r.x + r.width),
        pageH - (r.y + r.height)
      );
      return inset < safetyPx ? { el, inset } : null;
    },
    worst: (h) => h.inset,
    title: () => `Text inside the ${PRODUCT.safetyMm} mm safe area`,
    detail: ({ worst, store }) =>
      `"${label(worst.el)}" sits ${round1(pxToMm(worst.inset, store.dpi))} mm from the trim. Cutting tolerance is about a millimetre either way, so text this close can come back shaved.`,
    // Put it back on the layout margin, not on the legal minimum — landing
    // type at exactly 4 mm satisfies the rule and leaves the card visibly out
    // of alignment with everything else on it.
    fix: ({ hits, store, pageW, pageH }) => () =>
      hits.forEach(({ el }) => {
        const r = rectOf(el);
        const m = mmToPx(PRODUCT.marginMm, store.dpi);
        el.set({
          x: Math.min(Math.max(el.x, m), pageW - r.width - m),
          y: Math.min(Math.max(el.y, m), pageH - r.height - m),
        });
      }),
    fixLabel: 'Move onto the margin',
    pass: {
      title: 'Safe area',
      detail: `No text sits closer than ${PRODUCT.safetyMm} mm to the trim.`,
    },
  },

  {
    id: 'past-trim',
    scope: 'element',
    status: 'warn',
    match: (el, { store, page, outsideTrim }) =>
      outsideTrim(el) &&
      (page.bleed || 0) < mmToPx(PRODUCT.bleedMm, store.dpi) - 1
        ? { el }
        : null,
    title: ({ hits }) =>
      `${plural(hits.length, 'element')} past the trim with no bleed`,
    detail: ({ hits }) =>
      `"${label(hits[0].el)}" extends beyond the page. That is normal for a design meant to bleed, but with no bleed set there is nothing past the cut line for the guillotine to eat. Add bleed and this resolves itself.`,
    pass: {
      title: 'Artwork past the trim',
      detail: 'Nothing extends past the page without bleed behind it.',
    },
  },

  {
    id: 'placeholder',
    scope: 'element',
    status: 'fail',
    match: (el) =>
      el.type === 'text' && /\{\{.+?\}\}|\blorem ipsum\b/i.test(el.text)
        ? { el }
        : null,
    title: () => 'Unfilled merge field',
    detail: ({ hits }) =>
      `"${hits[0].el.text.slice(0, 48)}" still contains a template placeholder. In a variable-data run this is the difference between 5,000 postcards and 5,000 apologies.`,
    // Every field the product knows sample data for, not just one name.
    fix: ({ hits }) => () =>
      hits.forEach(({ el }) =>
        el.set({
          text: Object.entries(PRODUCT.sampleData).reduce(
            (text, [field, value]) =>
              text.replace(new RegExp(`\\{\\{\\s*${field}\\s*\\}\\}`, 'gi'), value),
            el.text
          ),
        })
      ),
    fixLabel: 'Fill with sample data',
    pass: {
      title: 'Merge fields',
      detail: 'No unfilled template placeholders left in the copy.',
    },
  },

  {
    id: 'contrast',
    scope: 'element',
    status: 'warn',
    // Measured only where the backdrop is genuinely knowable.
    match: (el, { elements, page }) => {
      if (el.type !== 'text') return null;
      const fg = parseColor(el.fill);
      const bg = backdropOf(el, elements, page);
      if (!fg || !bg) return null;
      const ratio = contrastRatio(fg, bg);
      return ratio < PRODUCT.minContrast ? { el, ratio } : null;
    },
    worst: (h) => h.ratio,
    title: () => 'Low contrast text',
    detail: ({ worst }) =>
      `"${label(worst.el)}" sits at ${round1(worst.ratio)}:1 against what is behind it, under the ${PRODUCT.minContrast}:1 target. Backlit screens flatter this; ink on paper does not. Only measured where the backdrop is a solid colour. Text over photography is not guessed at.`,
    fix: ({ worst }) => () => worst.el.set({ fill: PRODUCT.darkInk }),
    fixLabel: 'Darken text',
    pass: {
      title: 'Contrast',
      detail: `Every text element measured against a solid backdrop clears ${PRODUCT.minContrast}:1.`,
    },
  },

  {
    id: 'gamut',
    scope: 'element',
    status: 'warn',
    match: (el) => {
      for (const raw of inkedColors(el)) {
        const parsed = parseColor(raw);
        if (!parsed || parsed.a === 0) continue;
        const { s, l } = saturation(parsed);
        if (s > PRODUCT.maxSaturation && l > 0.2 && l < 0.8) return { el, color: raw };
      }
      return null;
    },
    title: ({ hits }) => `${plural(hits.length, 'colour')} outside CMYK gamut`,
    detail: ({ hits }) =>
      `${hits[0].color} on "${label(hits[0].el)}" is more saturated than four inks can reproduce. It will convert to something duller on press. Pick the printable version yourself rather than letting the RIP choose for you.`,
    pass: {
      title: 'Colour gamut',
      detail: 'Every solid colour in the design is reproducible in four inks.',
    },
  },

  {
    id: 'flat-black',
    scope: 'element',
    status: 'note',
    match: (el, { pageW, pageH }) => {
      if (el.type === 'text') return null;
      const r = rectOf(el);
      if (r.width * r.height <= pageW * pageH * PRODUCT.flatBlackCoverage) return null;
      const black = inkedColors(el).some((raw) => {
        const c = parseColor(raw);
        return c && c.a !== 0 && c.r === 0 && c.g === 0 && c.b === 0;
      });
      return black ? { el } : null;
    },
    title: () => 'Large area of flat black',
    detail: ({ hits }) =>
      `"${label(hits[0].el)}" is 100% K over a large area, which prints as washed-out charcoal rather than black. Printers usually want a rich black (around 60/40/40/100) for coverage like this, so ask yours for their build.`,
    pass: {
      title: 'Flat black',
      detail: 'No large area relies on 100% K alone.',
    },
  },

  {
    id: 'hairline',
    scope: 'element',
    status: 'warn',
    // A line's thickness is its height; a figure's is strokeWidth.
    match: (el, { store }) => {
      const thickness =
        el.type === 'line' ? el.height : el.stroke ? el.strokeWidth || 0 : 0;
      if (thickness <= 0) return null;
      const pt = pxToPt(thickness, store.dpi);
      return pt < PRODUCT.minHairlinePt ? { el, pt } : null;
    },
    worst: (h) => h.pt,
    title: () => 'Hairline rule',
    detail: ({ worst }) =>
      `"${label(worst.el)}" is ${round1(worst.pt)} pt. Below ${PRODUCT.minHairlinePt} pt a rule can break up or disappear entirely depending on the press.`,
    fix: ({ hits, store }) => () =>
      hits.forEach(({ el }) => {
        const min = Math.ceil(ptToPx(PRODUCT.minHairlinePt, store.dpi));
        el.set(el.type === 'line' ? { height: min } : { strokeWidth: min });
      }),
    fixLabel: `Thicken to ${PRODUCT.minHairlinePt} pt`,
    pass: {
      title: 'Hairlines',
      detail: `Every rule and stroke is ${PRODUCT.minHairlinePt} pt or thicker.`,
    },
  },

  {
    id: 'transparency',
    scope: 'element',
    status: 'note',
    // Read the boolean flags, not the `filters` map: it is a MobX-state-tree
    // instance, so `Object.keys` returns its internals and every element looks
    // filtered.
    match: (el) =>
      el.opacity < 1 ||
      el.shadowEnabled ||
      el.blurEnabled ||
      el.brightnessEnabled ||
      el.sepiaEnabled ||
      el.grayscaleEnabled
        ? { el }
        : null,
    title: ({ hits }) => `Transparency on ${plural(hits.length, 'element')}`,
    detail: () =>
      'Opacity, shadows, blurs, and filters. Modern presses handle live transparency, but older RIP workflows and PDF/X-1a require it flattened first. Ask your printer which they expect, since flattening late is a classic source of colour shifts.',
    pass: {
      title: 'Transparency',
      detail: 'Nothing in the design relies on transparency or live effects.',
    },
  },

  {
    id: 'hidden',
    scope: 'element',
    on: 'excluded',
    status: 'note',
    match: (el) => ({ el }),
    title: ({ hits }) => `${plural(hits.length, 'element')} will not print`,
    detail: ({ hits }) =>
      `"${label(hits[0].el)}" is hidden or excluded from export. Usually deliberate, but worth confirming it is not the piece someone meant to keep.`,
    pass: {
      title: 'Excluded elements',
      detail: 'Every element in the design will print.',
    },
  },

  {
    id: 'gradient-colour',
    scope: 'element',
    status: 'unknown',
    match: (el) =>
      inkedColors(el).some((raw) => !parseColor(raw) && raw.includes('gradient'))
        ? { el }
        : null,
    title: () => 'Gradient colours not evaluated',
    detail: ({ hits }) =>
      `${hits.length} element${hits.length === 1 ? ' uses' : 's use'} a gradient. Gamut and contrast are measured on solid colours only, so these were skipped rather than guessed at. Check them in a soft proof.`,
    // No `pass` on purpose: this rule exists to disclose a gap in coverage.
    // With no gradients there is no gap, and a row announcing one would be the
    // report inventing a finding.
  },
];

// --- the engine -------------------------------------------------------------

const isPrinting = (el) => el.visible !== false && el.showInExport !== false;

/** Turn one rule into one row, or into nothing if it has nothing to say. */
function toRow(rule, ctx) {
  if (rule.scope === 'document') return { id: rule.id, ...rule.run(ctx) };

  const pool = rule.on === 'excluded' ? ctx.excluded : ctx.printing;
  const hits = [];
  for (const el of pool) {
    const hit = rule.match(el, ctx);
    if (hit) hits.push(hit);
  }
  if (!hits.length) {
    return rule.pass ? { id: rule.id, status: 'pass', ...rule.pass } : null;
  }

  const worst = rule.worst ? minBy(hits, rule.worst) : hits[0];
  const found = { ...ctx, hits, worst };
  return {
    id: rule.id,
    status: rule.status,
    title: rule.title(found),
    detail: rule.detail(found),
    elementId: worst.el?.id,
    fix: rule.fix ? rule.fix(found) : null,
    fixLabel: rule.fixLabel,
  };
}

export async function runPreflight(store, rules = RULES) {
  const page = store.activePage;
  if (!page) return { checks: [], summary: 'No page to check.' };

  const elements = collect(page);
  const printing = elements.filter(isPrinting);

  // Prime the image cache before any rule runs, so `sizeOf` can be synchronous
  // and every rule stays a plain function. Fetching in parallel matters: a
  // design with twenty photos would otherwise wait twenty round trips.
  const srcs = [
    ...new Set(printing.filter((el) => el.type === 'image' && el.src).map((el) => el.src)),
  ];
  const sizes = new Map(
    await Promise.all(srcs.map(async (src) => [src, await cachedImageSize(src)]))
  );

  const pageW = page.computedWidth ?? store.width;
  const pageH = page.computedHeight ?? store.height;

  const ctx = {
    store,
    page,
    elements,
    printing,
    excluded: elements.filter((el) => !isPrinting(el)),
    pageW,
    pageH,
    safetyPx: mmToPx(PRODUCT.safetyMm, store.dpi),
    sizeOf: (src) => sizes.get(src) || null,
    // Whatever the app declared, plus the font a fix would substitute in —
    // that one has to count as available or the repair would fail its own
    // check. Nothing else: an allow-list with private exceptions is not one.
    availableFonts: new Set([
      ...getFontsList(),
      ...globalFonts.map((f) => f.fontFamily),
      ...(store.fonts || []).map((f) => f.fontFamily),
      PRODUCT.substituteFont,
    ]),
    outsideTrim: (el) => {
      const r = rectOf(el);
      return (
        r.x < -0.5 ||
        r.y < -0.5 ||
        r.x + r.width > pageW + 0.5 ||
        r.y + r.height > pageH + 0.5
      );
    },
  };

  const checks = rules.map((rule) => toRow(rule, ctx)).filter(Boolean);

  const count = (s) => checks.filter((c) => c.status === s).length;
  const fails = count('fail');
  const warns = count('warn');
  const unknowns = count('unknown');

  const parts = [];
  if (fails) {
    parts.push(
      `${plural(fails, 'problem')} a printer will reject. Fix ${fails === 1 ? 'it' : 'them'} before you submit.`
    );
  } else if (warns) {
    parts.push('Nothing blocking.');
  } else if (!unknowns) {
    const notes = count('note');
    parts.push(
      notes
        ? "Nothing blocking. Read the notes below against your printer's spec."
        : 'Every check passed.'
    );
  }
  if (warns) {
    parts.push(`${plural(warns, 'item')} to check against your printer's spec.`);
  }
  // An undetermined result has to reach the headline. "Every check passed"
  // over a report containing "not determined" is the false all-clear this
  // panel exists to prevent.
  if (unknowns) {
    parts.push(
      `${plural(unknowns, 'thing')} this check cannot determine — read ${unknowns === 1 ? 'it' : 'them'} below rather than assuming.`
    );
  }

  return { checks, summary: parts.join(' ') };
}
