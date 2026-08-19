/**
 * The colors of a callout, and the callout as an SVG image.
 *
 * Both ways to build a callout use this file:
 *   - the "built-in elements" way draws the balloon with it, on the canvas
 *   - the "custom element" way draws with react-konva, but its cards in the
 *     side panel come from here
 * so a card in the side panel can never show something else than the canvas.
 */

import { svgToURL } from 'polotno/utils/svg';

import { buildCallout } from './callout-geometry';

/** The colors of a new callout. */
export const CALLOUT_STYLE = {
  fill: '#ffffff',
  stroke: '#123047',
  strokeWidth: 3,
};

/**
 * Drawing options that come from the border width: space for the stroke
 * inside the box, and the size of the arrow head of a leader line.
 */
export const renderOptions = (strokeWidth) => ({
  pad: strokeWidth / 2 + 1,
  arrowSize: strokeWidth * 4,
});

/** The settings of one callout -> an SVG image. */
export function calloutToSVG(settings) {
  const { width, height, fill, stroke, strokeWidth } = settings;
  const { outline, leader, arrow } = buildCallout({
    ...settings,
    ...renderOptions(strokeWidth),
  });
  return svgToURL(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<path d="${outline}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>` +
      (leader
        ? `<path d="${leader}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
        : '') +
      (arrow ? `<path d="${arrow}" fill="${stroke}"/>` : '') +
      `</svg>`,
  );
}
