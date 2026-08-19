/**
 * Adds a callout of the `callout` type: the custom element and a normal
 * `text` element, in one group.
 */

import { autorun } from 'mobx';
import { forEveryChild } from 'polotno/model/group-model';

import { keepTextCentered, textAttrs, textOf } from '../shared/text-box';
import { CALLOUT_TYPE } from './callout-element';

/** The callout element of a group, or null for any other group. */
export const calloutOf = (element) =>
  (element?.type === 'group' &&
    element.children.find((child) => child.type === CALLOUT_TYPE)) ||
  null;

export function addCustomCallout(store, preset, position) {
  const page = store.activePage;
  const { width, height } = preset.attrs;
  const x = Math.round(position?.x ?? (store.width - width) / 2);
  const y = Math.round(position?.y ?? (store.height - height) / 2);

  // every setting is an attribute of the element, so there is nothing else
  // to write: the model holds the defaults
  const callout = page.addElement({
    type: CALLOUT_TYPE,
    ...preset.attrs,
    x,
    y,
  });
  const text = page.addElement(textAttrs(callout, preset, callout));

  return store.groupElements([callout.id, text.id]);
}

/** Keeps the text in the middle of the balloon of its group. */
export function installCustomSync(store) {
  return autorun(() => {
    store.pages.forEach((page) =>
      forEveryChild(page, (element) => {
        const callout = calloutOf(element);
        const text = callout && textOf(element);
        if (!text) return;
        keepTextCentered(store, callout, text, callout.inset);
      }),
    );
  });
}
