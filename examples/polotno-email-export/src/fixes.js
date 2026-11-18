// One-click fixes for the Audit. Each takes the element a warning names and
// changes it so the next export keeps its text live (or shows it the same in
// every client). Not every warning has one: an overlap or low contrast is a
// design choice only the designer can make.

const FALLBACK = { Roboto: 'Arial', Inter: 'Arial', 'Playfair Display': 'Georgia' };
const fallbackOf = (family) => FALLBACK[family] || 'Arial';
const firstColor = (fill) => String(fill).match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/i)?.[0] || '#161616';

const RASTER_FIXES = {
  'fallback-overflow': [
    // A line that fits in the design font runs wider in Arial: give it room, or
    // design it in the font Gmail and Outlook will show.
    { label: 'Narrow the box', apply: (el) => el.set({ width: Math.round(el.width * 0.9) }) },
    { label: (el) => `Use ${fallbackOf(el.fontFamily)}`, apply: (el) => el.set({ fontFamily: fallbackOf(el.fontFamily) }) },
  ],
  occluded: [{ label: 'Bring text to front', apply: (el) => el.moveTop() }],
  // Text over text in a web font parts where the font falls back.
  layered: [{ label: (el) => `Use ${fallbackOf(el.fontFamily)}`, apply: (el) => el.set({ fontFamily: fallbackOf(el.fontFamily) }) }],
  rotated: [{ label: 'Straighten', apply: (el) => el.set({ rotation: 0 }) }],
  curved: [{ label: 'Remove curve', apply: (el) => el.set({ curveEnabled: false }) }],
  stroke: [{ label: 'Remove outline', apply: (el) => el.set({ strokeWidth: 0 }) }],
  effect: [{ label: 'Remove effects', apply: (el) => el.set({ blurEnabled: false, shadowEnabled: false }) }],
  'gradient-fill': [{ label: 'Use a solid colour', apply: (el) => el.set({ fill: firstColor(el.fill) }) }],
  justify: [{ label: 'Align left', apply: (el) => el.set({ align: 'left' }) }],
  'text-box-paint': [{ label: 'Remove background', apply: (el) => el.set({ backgroundEnabled: false }) }],
};

const APPROX_FIX = {
  'stroke-dropped': { strokeWidth: 0 },
  'shadow-dropped': { shadowEnabled: false },
};

export function fixesFor(warning, el) {
  if (!el) return [];
  switch (warning.code) {
    case 'text-rasterized':
      return (RASTER_FIXES[warning.details.reason] || []).map((f) => ({
        label: typeof f.label === 'function' ? f.label(el) : f.label,
        apply: () => f.apply(el),
      }));
    case 'text-approximated': {
      const attrs = Object.assign({}, ...warning.details.approximations.map((a) => APPROX_FIX[a] || {}));
      if (warning.details.approximations.includes('gradient-solid')) attrs.fill = firstColor(el.fill);
      return [{ label: 'Make it look the same everywhere', apply: () => el.set(attrs) }];
    }
    case 'text-too-small':
      return [{ label: 'Set to 14 px', apply: () => el.set({ fontSize: 14 }) }];
    case 'text-tight':
      return [{ label: 'Loosen line height', apply: () => el.set({ lineHeight: Math.max(1.3, el.lineHeight || 0) }) }];
    default:
      return [];
  }
}
