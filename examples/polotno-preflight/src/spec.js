// The product being printed. In a real integration this comes from your
// catalogue — the printer's spec for the SKU the user is ordering — and the
// preflight rules are read from it rather than hardcoded here.
export const PRODUCT = {
  name: 'A6 postcard',
  widthMm: 148,
  heightMm: 105,
  dpi: 300,
  // Printer requirements. Every rule the report publishes lives here, so
  // "what counts as a problem" is data, not scattered `if`s. (Numeric
  // tolerances — how close to the trim counts as "at" it — stay next to the
  // comparison they belong to; they are measurement noise, not policy.)
  bleedMm: 3,
  safetyMm: 4,
  // The layout's own margin. `safetyMm` is what the printer enforces;
  // this is where the design actually hangs, and where a fix should put
  // something back — snapping to the legal minimum is technically correct and
  // visibly wrong.
  marginMm: 7.8,
  minImageDpi: 300,
  minTypePt: 6,
  minHairlinePt: 0.25,
  minContrast: 4.5,
  // Above this saturation, four inks cannot reproduce the colour. A
  // heuristic, not a profile conversion — see the gamut check.
  maxSaturation: 0.8,
  // Flat black over more than this fraction of the page wants a rich build.
  flatBlackCoverage: 0.03,

  // Repair policy. What a fix button does is as much a printer decision as
  // what counts as a defect, so it lives with the rest of the spec.
  substituteFont: 'Roboto',
  darkInk: '#0B1D26',
  sampleData: { first_name: 'Alex' },
};

export const mmToPx = (mm, dpi = PRODUCT.dpi) => (mm / 25.4) * dpi;
export const pxToMm = (px, dpi = PRODUCT.dpi) => (px / dpi) * 25.4;
export const pxToPt = (px, dpi = PRODUCT.dpi) => (px / dpi) * 72;
export const ptToPx = (pt, dpi = PRODUCT.dpi) => (pt / 72) * dpi;

export const PAGE_WIDTH = Math.round(mmToPx(PRODUCT.widthMm));
export const PAGE_HEIGHT = Math.round(mmToPx(PRODUCT.heightMm));

export const round1 = (n) => Math.round(n * 10) / 10;
