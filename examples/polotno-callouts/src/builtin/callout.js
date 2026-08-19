/**
 * Way 1: a callout made only from built-in Polotno elements.
 *
 * One callout is a `group` with two children:
 *   - an `svg` element  (custom.role === 'shape') - the balloon and its tail
 *   - a `text` element  (custom.role === 'text')  - the label
 *
 * The settings of the balloon live in the `custom` attribute of the group.
 * `custom` is the only place where you can keep your own data on an element,
 * and Polotno writes it into the JSON of the design.
 *
 *   group.custom = { callout: { shape, tail, tipX, tipY, fill, stroke, ... } }
 *
 * `installBuiltinSync()` watches these settings and writes a new `src` into
 * the svg element each time they change. Nothing else in the editor changes:
 * the group moves, rotates, resizes, exports and undoes like any other group.
 *
 * Cost of this way: you cannot draw anything of your own on the canvas, so
 * the tail is pointed from the toolbar. Value: the design has no element type
 * that other Polotno tools do not know.
 */

import { autorun, untracked } from 'mobx';
import { forEveryChild } from 'polotno/model/group-model';

import { CALLOUT_DEFAULTS } from '../shared/callout-geometry';
import { CALLOUT_STYLE, calloutToSVG } from '../shared/callout-svg';
import { keepTextCentered, textAttrs, textOf } from '../shared/text-box';

/** The settings of a built-in callout, or null for any other group. */
export const builtinSettingsOf = (element) =>
  (element?.type === 'group' && element.custom?.callout) || null;

const shapeOf = (group) =>
  group.children.find((child) => child.custom?.role === 'shape');

/** Adds a new callout and selects it. It goes to the center by default. */
export function addBuiltinCallout(store, preset, position) {
  const page = store.activePage;
  // the size belongs to the svg element, the rest is the style of the callout
  const { width, height, ...attrs } = preset.attrs;
  const settings = { ...CALLOUT_DEFAULTS, ...CALLOUT_STYLE, ...attrs };
  const x = Math.round(position?.x ?? (store.width - width) / 2);
  const y = Math.round(position?.y ?? (store.height - height) / 2);

  const shape = page.addElement({
    type: 'svg',
    name: 'callout-shape',
    x,
    y,
    width,
    height,
    keepRatio: false,
    src: calloutToSVG({ ...settings, width, height }),
    custom: { role: 'shape' },
  });
  const text = page.addElement(textAttrs(shape, preset, settings));

  return store.groupElements([shape.id, text.id], {
    custom: { callout: settings },
  });
}

/** Changes the settings of a callout. The sync below draws the new shape. */
export function updateBuiltinCallout(store, group, patch) {
  store.history.transaction(() => {
    group.set({
      custom: {
        ...group.custom,
        callout: { ...group.custom.callout, ...patch },
      },
    });
  });
}

/**
 * Draws the svg again when the settings or the size change, and keeps the
 * text in the middle of the balloon.
 *
 * The write is inside `untracked()`, so it does not start the reaction again,
 * and inside `history.ignore()`, so it does not add undo steps of its own.
 */
export function installBuiltinSync(store) {
  return autorun(() => {
    store.pages.forEach((page) =>
      forEveryChild(page, (element) => {
        const settings = builtinSettingsOf(element);
        if (!settings) return;
        const shape = shapeOf(element);
        const text = textOf(element);
        if (!shape || !text) return;

        // a tracked read: the reaction starts again when the shape changes
        const src = calloutToSVG({
          ...settings,
          width: shape.width,
          height: shape.height,
        });
        untracked(() => {
          if (src === shape.src) return;
          store.history.ignore(() => shape.set({ src }));
        });

        keepTextCentered(store, shape, text, settings.inset);
      }),
    );
  });
}
