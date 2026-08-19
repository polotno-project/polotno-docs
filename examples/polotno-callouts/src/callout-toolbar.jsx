/**
 * The controls of a callout in the top toolbar, for both ways to build one.
 *
 * A selected callout is either a `group` (way 1, and way 2 groups its element
 * with the text) or the `callout` element itself (way 2, after a second
 * click). So the controls appear through two seams:
 *
 *   - `unstable_registerToolbarComponent(CALLOUT_TYPE, ...)` gives the new
 *     element type its own toolbar. A new type has no built-in toolbar, so a
 *     registration is the right thing here.
 *   - `CALLOUT_TOOLBAR` adds the same controls to the toolbar of the `group`
 *     type. Any key of the `components` prop of `<Toolbar/>` that starts with
 *     the name of a type is added to the toolbar of that type, so the
 *     built-in group controls stay:
 *
 *       <Toolbar store={store} components={CALLOUT_TOOLBAR} />
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { unstable_registerToolbarComponent } from 'polotno/config';

import { CALLOUT_ITEMS, CalloutControls } from './shared/callout-controls';
import { builtinSettingsOf, updateBuiltinCallout } from './builtin/callout';
import { calloutOf } from './custom-element/add-callout';
import { CALLOUT_TYPE } from './custom-element/callout-element';

/** Settings of the callout inside a group, whichever way built it. */
const settingsOfGroup = (store, group) => {
  const builtin = builtinSettingsOf(group);
  if (builtin) {
    return {
      settings: builtin,
      madeFrom: 'built-in elements',
      onChange: (patch) => updateBuiltinCallout(store, group, patch),
    };
  }
  const callout = calloutOf(group);
  if (callout) return customControls(store, callout);
  return null;
};

// one history step for one action of the user
const customControls = (store, callout) => ({
  settings: callout,
  madeFrom: 'a custom element',
  onChange: (patch) => store.history.transaction(() => callout.set(patch)),
});

// the toolbar of the balloon of way 2, selected on its own
unstable_registerToolbarComponent(
  CALLOUT_TYPE,
  observer(({ store }) => (
    <CalloutControls
      store={store}
      {...customControls(store, store.selectedElements[0])}
    />
  )),
);

// the same controls, added to the toolbar of a group of balloon + text
const groupItem = (Control) =>
  observer(({ store, element }) => {
    const found = settingsOfGroup(store, element);
    return found ? <Control store={store} {...found} /> : null;
  });

export const CALLOUT_TOOLBAR = {
  GroupCalloutFill: groupItem(CALLOUT_ITEMS.CalloutFill),
  GroupCalloutStroke: groupItem(CALLOUT_ITEMS.CalloutStroke),
  GroupCalloutSettings: groupItem(CALLOUT_ITEMS.CalloutSettings),
};
