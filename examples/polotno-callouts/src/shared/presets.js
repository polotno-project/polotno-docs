/** The callouts the side panel offers. Both ways use the same list. */

import { CALLOUT_STYLE, calloutToSVG } from './callout-svg';

export const PRESETS = [
  {
    name: 'Balloon',
    text: 'This is a callout',
    fontSize: 34,
    attrs: {
      width: 320,
      height: 220,
      shape: 'ellipse',
      tail: 'triangle',
      tipX: 0.06,
      tipY: 0.94,
    },
  },
  {
    name: 'Box',
    text: 'This is a callout',
    fontSize: 34,
    attrs: {
      width: 320,
      height: 200,
      shape: 'rect',
      tail: 'triangle',
      tipX: 0.3,
      tipY: 0.97,
    },
  },
  {
    name: 'Leader line',
    text: '123',
    fontSize: 34,
    attrs: {
      width: 260,
      height: 220,
      shape: 'ellipse',
      tail: 'line',
      tipX: 0.95,
      tipY: 0.95,
      inset: 0.22,
    },
  },
];

/** One card of the side panel. The picture is the shape the canvas draws. */
export const PRESET_CARDS = PRESETS.map((preset) => ({
  preset,
  preview: calloutToSVG({ ...CALLOUT_STYLE, ...preset.attrs }),
}));
