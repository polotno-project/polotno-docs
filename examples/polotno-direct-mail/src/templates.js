// The three starter designs, built in code rather than shipped as exported
// JSON, so the layout reads as inches and the merge conventions are visible:
//
//   {{field}} in any text            → filled per donor
//   custom.variable = 'segment_photo' → photo chosen by the donor's segment
//   custom.variable = 'qr'           → generated per donor
//   custom.fit                        → how text shrinks when a value is long
//   custom.zoneOwner                  → the one element allowed in a USPS zone
//   custom.overlay                    → guide drawn in the editor, never printed

import { FORMATS, inch, pt } from './spec.js';
import { ORG, COLORS, FONTS, PHOTOS, DEFAULT_CAMPAIGN } from './campaign.js';

let seq = 0;
const uid = (p) => `${p}-${(++seq).toString(36)}`;

// Brand elements and the mail furniture can't be moved, restyled or deleted.
// The marketer edits the message; the address block stays where USPS needs it.
const LOCKED = {
  draggable: false,
  resizable: false,
  removable: false,
  contentEditable: false,
  styleEditable: false,
};

const svgUrl = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const logoMark = (bg, fg) =>
  svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><g fill="${fg}"><path d="M50 18c9 10 9 24 0 36-9-12-9-26 0-36z"/><path d="M52 58c11-9 24-9 30 0-10 9-21 9-30 0z"/><path d="M48 58c-11-9-24-9-30 0 10 9 21 9 30 0z"/><rect x="47.5" y="52" width="5" height="30" rx="2.5"/></g></svg>`
  );

// What a per-donor code looks like before there is a donor.
const placeholder = (label, w = 200, h = 200) =>
  svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="#ffffff" stroke="${COLORS.green}" stroke-width="4" stroke-dasharray="10 8"/><text x="${w / 2}" y="${h / 2 + 8}" font-family="sans-serif" font-size="22" font-weight="600" text-anchor="middle" fill="${COLORS.green}">${label}</text></svg>`
  );

export function coverCrop(boxW, boxH, imgW, imgH) {
  const box = boxW / boxH;
  const img = imgW / imgH;
  if (img > box) {
    const w = box / img;
    return { cropX: (1 - w) / 2, cropY: 0, cropWidth: w, cropHeight: 1 };
  }
  const h = img / box;
  // Bias toward the top third: people's faces, not the tabletop.
  return { cropX: 0, cropY: (1 - h) * 0.35, cropWidth: 1, cropHeight: h };
}

// --- element helpers (inches and points in, pixels out) ------------------

function text({ x, y, w, h, size, lines, ...rest }) {
  const lineHeight = rest.lineHeight ?? 1.25;
  const count = lines ?? String(rest.text).split('\n').length;
  return {
    type: 'text',
    id: uid('t'),
    fontFamily: FONTS.sans,
    fill: COLORS.ink,
    align: 'left',
    lineHeight,
    ...rest,
    x: inch(x),
    y: inch(y),
    width: inch(w),
    height: h ? inch(h) : Math.ceil(pt(size) * lineHeight * count),
    fontSize: pt(size),
  };
}

function rect({ x, y, w, h, ...rest }) {
  return {
    type: 'figure',
    subType: 'rect',
    id: uid('r'),
    fill: 'rgba(0,0,0,0)',
    ...rest,
    x: inch(x),
    y: inch(y),
    width: inch(w),
    height: inch(h),
  };
}

function image({ x, y, w, h, ...rest }) {
  return { type: 'image', id: uid('i'), ...rest, x: inch(x), y: inch(y), width: inch(w), height: inch(h) };
}

function segmentPhoto({ x, y, w, h }) {
  const photo = PHOTOS[DEFAULT_CAMPAIGN.segments.active.photo];
  return image({
    x, y, w, h,
    name: 'Segment photo',
    src: photo.src,
    ...coverCrop(w, h, photo.width, photo.height),
    custom: { variable: 'segment_photo' },
  });
}

function logo({ x, y, size, onDark, word, sub }) {
  const fg = onDark ? COLORS.cream : COLORS.green;
  return [
    image({
      x, y, w: size, h: size,
      name: 'Logo mark',
      src: onDark ? logoMark(COLORS.cream, COLORS.green) : logoMark(COLORS.green, COLORS.cream),
      ...LOCKED,
    }),
    text({
      x: x + size * 1.18, y: y + size * 0.02, w: 3, size: word,
      text: ORG.name, name: 'Logo wordmark', fontFamily: FONTS.display, fontWeight: '600', fill: fg, lineHeight: 1.1,
      ...LOCKED,
    }),
    text({
      x: x + size * 1.2, y: y + size * 0.02 + (pt(word) * 1.15) / 300, w: 3, size: sub,
      text: ORG.descriptor, name: 'Logo descriptor', fontWeight: '600', letterSpacing: 0.25, fill: fg, lineHeight: 1.1,
      ...LOCKED,
    }),
  ];
}

function qr({ x, y, size }) {
  return image({ x, y, w: size, h: size, name: 'Give online QR', src: placeholder('QR per donor'), custom: { variable: 'qr' } });
}

function addressBlock({ x, y, w, h, size, owner }) {
  return [
    text({
      x, y, w, size: Math.max(5.5, size * 0.66),
      text: '{{donor_id}}', name: 'Donor ID', fill: COLORS.muted, ...LOCKED,
      custom: { zoneOwner: owner },
    }),
    text({
      x, y: y + (pt(Math.max(5.5, size * 0.66)) * 1.4) / 300, w, h, size,
      text: '{{full_name}}\n{{address_1}}\n{{address_2}}\n{{city_state_zip}}',
      name: 'Address block', textTransform: 'uppercase', lineHeight: 1.2,
      ...LOCKED,
      custom: { zoneOwner: owner, collapseEmptyLines: true, fit: { mode: 'lines', min: pt(7) } },
    }),
  ];
}

// --- the three designs ---------------------------------------------------

function indicia({ x, y, w, h, size }) {
  return [
    rect({ x, y, w, h, stroke: COLORS.ink, strokeWidth: 3, name: 'Indicia box', ...LOCKED, custom: { zoneOwner: 'postage' } }),
    text({
      x, y: y + h * 0.1, w, size, align: 'center', fontWeight: '600', lineHeight: 1.25,
      text: ORG.permit, name: 'Permit indicia', ...LOCKED, custom: { zoneOwner: 'postage' },
    }),
  ];
}

// The 6 × 9 and 6 × 11 share a layout. The extra width of the larger card
// goes to the photo on the front and to the message column on the back; the
// address side's right half stays anchored to the right edge, where USPS
// measures its zones from.
function buildWidePostcard(formatId) {
  const { widthIn: W, bleedIn: B } = FORMATS[formatId];
  const d = W - 9;
  const front = [
    segmentPhoto({ x: 3.4, y: -B, w: W + B - 3.4, h: 6 + 2 * B }),
    rect({ x: -B, y: -B, w: 3.4 + B, h: 6 + 2 * B, fill: COLORS.green, name: 'Color panel', ...LOCKED }),
    ...logo({ x: 0.45, y: 0.45, size: 0.5, word: 13, sub: 6.5, onDark: true }),
    text({
      x: 0.45, y: 1.3, w: 2.6, h: 2.7, size: 30, fontFamily: FONTS.display, fontWeight: '600', fill: COLORS.cream, lineHeight: 1.08,
      text: '{{headline}}', name: 'Headline', verticalAlign: 'bottom', custom: { fit: { mode: 'box', min: pt(16) } },
    }),
    text({
      x: 0.45, y: 4.2, w: 2.6, h: 0.45, size: 11, fill: COLORS.cream, lineHeight: 1.3, name: 'Subline',
      text: 'Your gift of {{ask_1}} provides {{meals_1}} meals for a neighbor.', custom: { fit: { mode: 'box', min: pt(8) } },
    }),
    rect({ x: 0.45, y: 4.95, w: 2.6, h: 0.32, fill: COLORS.orange, name: 'Match tag' }),
    text({
      x: 0.5, y: 4.95, w: 2.5, h: 0.32, size: 7.5, align: 'center', verticalAlign: 'middle', fontWeight: '700', fill: COLORS.cream, letterSpacing: 0.12,
      textTransform: 'uppercase', text: 'Gifts matched until {{match_deadline}}', name: 'Match tag label',
      custom: { fit: { mode: 'lines', min: pt(5.5) } },
    }),
  ];
  const back = [
    ...logo({ x: 0.4, y: 0.4, size: 0.42, word: 11, sub: 5.5 }),
    text({ x: 0.4, y: 0.92, w: 2.5, size: 7, fill: COLORS.muted, lineHeight: 1.3, text: ORG.returnAddress, name: 'Return address', ...LOCKED }),
    text({ x: 0.4, y: 1.45, w: 3.75 + d, size: 11, fontFamily: FONTS.body, fontWeight: '600', text: '{{greeting}}', name: 'Greeting' }),
    text({
      x: 0.4, y: 1.76, w: 3.75 + d, h: 1.8, size: 10, fontFamily: FONTS.body, lineHeight: 1.38, name: 'Message',
      text: `{{opening}}\n\nGive {{ask_1}} by {{match_deadline}} and ${ORG.matchSponsor} will match it, dollar for dollar.`,
      custom: { fit: { mode: 'box', min: pt(8) } },
    }),
    text({ x: 0.38, y: 3.62, w: 3, size: 20, fontFamily: FONTS.script, fill: COLORS.green, lineHeight: 1.1, text: ORG.signer, name: 'Signature', ...LOCKED }),
    text({ x: 0.4, y: 3.96, w: 3, size: 7.5, fill: COLORS.muted, text: ORG.signerTitle, name: 'Signer', ...LOCKED }),
    qr({ x: 0.4, y: 4.5, size: 1.05 }),
    text({ x: 1.6, y: 4.62, w: 2.5, size: 9, fontWeight: '600', fill: COLORS.green, text: 'Scan to give online', name: 'QR label' }),
    text({ x: 1.6, y: 4.86, w: 2.5, size: 8, fill: COLORS.muted, text: `or call ${ORG.phone}`, name: 'Phone' }),
    rect({ x: 4.36 + d, y: 0.4, w: 0.012, h: 4.85, fill: '#CFC6B4', name: 'Divider', ...LOCKED }),
    text({
      x: 4.7 + d, y: 1.45, w: 2.55, h: 1.55, size: 15, fontFamily: FONTS.display, fontWeight: '600', fill: COLORS.green, lineHeight: 1.12,
      text: '{{name}}, your gift goes twice as far until {{match_deadline}}.', name: 'Teaser',
      custom: { fit: { mode: 'box', min: pt(10) } },
    }),
    ...indicia({ x: 7.6 + d, y: 0.3, w: 1.1, h: 0.82, size: 5.5 }),
    ...addressBlock({ x: 4.85 + d, y: 3.4, w: 3.4, h: 1.25, size: 10, owner: 'address' }),
  ];
  return [
    { background: COLORS.cream, bleed: inch(B), children: front },
    { background: COLORS.cream, bleed: inch(B), children: back },
  ];
}

function buildPostcard46() {
  const B = FORMATS.postcard46.bleedIn;
  const front = [
    segmentPhoto({ x: -B, y: -B, w: 6 + 2 * B, h: 2.7 + B }),
    rect({ x: -B, y: 2.55, w: 6 + 2 * B, h: 1.45 + B, fill: COLORS.green, name: 'Color band', ...LOCKED }),
    text({
      x: 0.3, y: 2.72, w: 4.3, h: 0.78, size: 17, fontFamily: FONTS.display, fontWeight: '600', fill: COLORS.cream, lineHeight: 1.08,
      text: '{{headline}}', name: 'Headline', verticalAlign: 'bottom', custom: { fit: { mode: 'box', min: pt(10) } },
    }),
    text({ x: 0.3, y: 3.62, w: 4.3, size: 8, fill: COLORS.cream, text: 'Every $1 provides 3 meals. Gifts matched until {{match_deadline}}.', name: 'Subline' }),
    image({ x: 5.05, y: 2.85, w: 0.62, h: 0.62, name: 'Logo mark', src: logoMark(COLORS.cream, COLORS.green), ...LOCKED }),
  ];
  const back = [
    ...logo({ x: 0.25, y: 0.25, size: 0.32, word: 8.5, sub: 5 }),
    text({ x: 0.25, y: 0.64, w: 2, size: 6, fill: COLORS.muted, lineHeight: 1.3, text: ORG.returnAddress, name: 'Return address', ...LOCKED }),
    text({ x: 0.25, y: 1.0, w: 1.95, size: 8.5, fontFamily: FONTS.body, fontWeight: '600', text: '{{greeting}}', name: 'Greeting' }),
    text({
      x: 0.25, y: 1.22, w: 1.95, h: 1.4, size: 7.5, fontFamily: FONTS.body, lineHeight: 1.32, name: 'Message',
      text: `Give {{ask_1}} by {{match_deadline}} and ${ORG.matchSponsor} will match it. Every $1 provides 3 meals for a neighbor.`,
      custom: { fit: { mode: 'box', min: pt(6) } },
    }),
    qr({ x: 0.25, y: 2.72, size: 0.78 }),
    text({ x: 1.1, y: 2.82, w: 1.1, size: 7, fontWeight: '600', fill: COLORS.green, text: 'Scan to give', name: 'QR label' }),
    text({ x: 1.1, y: 3.0, w: 1.1, size: 6, fill: COLORS.muted, text: ORG.phone, name: 'Phone' }),
    text({
      x: 2.5, y: 0.3, w: 1.7, h: 1.1, size: 11, fontFamily: FONTS.display, fontWeight: '600', fill: COLORS.green, lineHeight: 1.1,
      text: '{{name}}, your gift goes twice as far.', name: 'Teaser',
      custom: { fit: { mode: 'box', min: pt(7) } },
    }),
    ...indicia({ x: 4.82, y: 0.22, w: 0.98, h: 0.62, size: 5 }),
    ...addressBlock({ x: 2.5, y: 1.85, w: 2.9, h: 1.1, size: 9, owner: 'address' }),
  ];
  return [
    { background: COLORS.cream, bleed: inch(B), children: front },
    { background: COLORS.cream, bleed: inch(B), children: back },
  ];
}

const BUILDERS = {
  postcard46: buildPostcard46,
  postcard69: () => buildWidePostcard('postcard69'),
  postcard611: () => buildWidePostcard('postcard611'),
};

/** The guides for a format's USPS zones, as non-printing overlay elements. */
export function zoneOverlays(format) {
  return format.zones.flatMap((z) => [
    rect({
      x: z.x, y: z.y, w: z.w, h: z.h,
      name: `Zone: ${z.label}`,
      fill: 'rgba(217,105,43,0.07)', stroke: COLORS.orange, strokeWidth: 3, dash: [14, 10],
      selectable: false, showInExport: false, alwaysOnTop: true,
      custom: { overlay: true, zone: z.id },
    }),
    text({
      // Bottom-right corner: the owned element (address, indicia) sits top-left.
      x: z.x + 0.06, y: z.y + z.h - 0.14, w: z.w - 0.12, size: 6, align: 'right', fontWeight: '700', fill: COLORS.orange, letterSpacing: 0.08,
      textTransform: 'uppercase', text: z.label, name: `Zone label: ${z.label}`,
      selectable: false, showInExport: false, alwaysOnTop: true,
      custom: { overlay: true, zoneLabel: z.id },
    }),
  ]);
}

export function buildTemplate(formatId) {
  const format = FORMATS[formatId];
  const pages = BUILDERS[formatId]().map((p, i) => ({
    id: uid('page'),
    width: 'auto',
    height: 'auto',
    bleed: 0,
    ...p,
    children: i === format.addressPage ? [...p.children, ...zoneOverlays(format)] : p.children,
    custom: { side: format.pageNames[i] },
  }));
  return {
    width: inch(format.widthIn),
    height: inch(format.heightIn),
    unit: 'in',
    dpi: 300,
    fonts: [],
    pages,
  };
}
