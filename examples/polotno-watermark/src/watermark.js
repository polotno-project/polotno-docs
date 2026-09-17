/**
 * Builds a tiled watermark as a single full-page image.
 *
 * A watermark that appears once in the middle is trivially cropped out, so
 * both the text and the logo variants repeat across the whole page at an
 * angle. One tile is drawn, then `createPattern` repeats it over a square
 * big enough that the page corners stay covered after rotation.
 *
 * The result is one element on the design rather than dozens, which keeps it
 * cheap to lock, to toggle, and to export.
 */

export const WATERMARK = 'watermark';

export const DEFAULT_CONFIG = {
  mode: 'text', // 'text' | 'logo'
  text: 'CONFIDENTIAL',
  logoSrc: null,
  scale: 46, // font size for text, tile width for a logo
  gap: 2.0, // spacing between tiles, as a multiple of the tile content
  angle: -35,
  opacity: 0.28,
};

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function textTile({ text, scale, gap }) {
  const label = text || ' ';
  const font = `600 ${scale}px Roboto, Helvetica, Arial, sans-serif`;

  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const textWidth = Math.max(measure.measureText(label).width, 1);

  const tile = document.createElement('canvas');
  tile.width = Math.ceil(textWidth + scale * gap);
  tile.height = Math.ceil(scale * gap * 1.5);

  const ctx = tile.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, tile.width / 2, tile.height / 2);

  return tile;
}

async function logoTile({ logoSrc, scale, gap }) {
  const img = await loadImage(logoSrc);

  // Height follows the logo's own proportions. Forcing both dimensions is
  // what squashes an uploaded logo into the wrong shape.
  const ratio = img.naturalHeight / img.naturalWidth;
  const logoWidth = scale * 4;
  const logoHeight = Math.max(Math.round(logoWidth * ratio), 1);

  const tile = document.createElement('canvas');
  tile.width = Math.ceil(logoWidth * gap);
  tile.height = Math.ceil(logoHeight * gap);

  const ctx = tile.getContext('2d');
  ctx.drawImage(
    img,
    (tile.width - logoWidth) / 2,
    (tile.height - logoHeight) / 2,
    logoWidth,
    logoHeight
  );

  return tile;
}

/** Repeat one tile across a `width` x `height` page, rotated by `angle`. */
function tileAcross(tile, width, height, angle) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return canvas.toDataURL('image/png');

  // The diagonal is the smallest square that still covers every corner once
  // the context is rotated.
  const diagonal = Math.ceil(Math.hypot(width, height));

  ctx.translate(width / 2, height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.fillStyle = pattern;
  ctx.fillRect(-diagonal / 2, -diagonal / 2, diagonal, diagonal);

  return canvas.toDataURL('image/png');
}

/** Redraw the watermark element from a config object. */
export async function renderWatermark(store, config) {
  const element = store.pages
    .flatMap((page) => page.children)
    .find((el) => el.name === WATERMARK);
  if (!element) return;

  const usingLogo = config.mode === 'logo' && config.logoSrc;

  // Fonts have to be ready before measuring, or the tile is sized for the
  // fallback face and the spacing jumps once the real one loads.
  if (!usingLogo && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const tile = usingLogo
    ? await logoTile(config)
    : textTile(config);

  element.set({
    src: tileAcross(tile, store.width, store.height, config.angle),
    opacity: config.opacity,
    custom: { ...config },
  });
}
