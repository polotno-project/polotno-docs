/**
 * The text of a callout.
 *
 * Both ways to build a callout put a normal Polotno `text` element on the
 * balloon, so the text keeps the fonts, the colors and the editing of the
 * editor. This file holds the one rule they share: the text box is the body
 * of the balloon, and the text stays in the middle of it.
 */

import { untracked } from 'mobx';

import { getBody } from './callout-geometry';

/** Space between the border of the body and the text, as a fraction. */
const TEXT_PADDING = 0.09;

/**
 * Where the text element must be. `owner` is the element that draws the
 * balloon: the `svg` element, or the `callout` element.
 */
export function getTextBox(owner, inset, textHeight) {
  const body = getBody({ width: owner.width, height: owner.height, inset });
  const padding = Math.min(body.width, body.height) * TEXT_PADDING;
  return {
    x: owner.x + body.x + padding,
    y: owner.y + body.y + Math.max(0, (body.height - textHeight) / 2),
    width: body.width - padding * 2,
  };
}

const sameBox = (box, text) =>
  Math.abs(box.x - text.x) < 0.5 &&
  Math.abs(box.y - text.y) < 0.5 &&
  Math.abs(box.width - text.width) < 0.5;

/**
 * True while the user moves or resizes the text with the mouse. Nothing may
 * write the box then: the transformer works from the size of the element, so
 * a write in the middle of a drag makes the font size run away.
 *
 * Text edit mode is not such a state - there the text stays in the middle of
 * the balloon while the user types. `_editModeEnabled` has no public name yet;
 * `isSelectedDirectly` alone also works, but then the text finds its place
 * again only after the user deselects it.
 */
const isUserDragging = (text) =>
  text.isSelectedDirectly && !text._editModeEnabled;

/**
 * Puts the text back in the middle of the balloon. Call it from a reaction:
 * the reads are tracked, the write is not.
 */
export function keepTextCentered(store, owner, text, inset) {
  const box = getTextBox(owner, inset, text.height);
  const dragging = isUserDragging(text);

  untracked(() => {
    // read the current box here, or writing it starts the reaction again
    if (dragging || sameBox(box, text)) return;
    // `history.ignore` keeps these corrections out of the undo steps
    store.history.ignore(() => text.set(box));
  });
}

/** The text element of a callout group. */
export const textOf = (group) =>
  group.children.find((child) => child.custom?.role === 'text');

/** The attributes of the text element of a new callout. */
export const textAttrs = (owner, preset, settings) => ({
  type: 'text',
  name: 'callout-text',
  text: preset.text,
  fontSize: preset.fontSize,
  align: 'center',
  fill: settings.stroke,
  custom: { role: 'text' },
  ...getTextBox(owner, settings.inset, 0),
});
