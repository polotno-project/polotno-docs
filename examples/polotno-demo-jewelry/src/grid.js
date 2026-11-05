// The millimetre dot grid. It's painted on the workspace behind the
// (transparent) sheet in frame.jsx, as one lattice across the whole work
// area; these are its colours.

export const DOT_INK = { dark: '236,229,216', light: '29,27,23' };

const isGrid = (e) => e.custom?.kind === 'grid';

// Earlier builds drew the grid as a layer inside the page. Remove it from
// pages that still have it.
export function ensureGrid(store) {
  const page = store.activePage;
  if (!page) return;
  const old = page.children.filter(isGrid).map((e) => e.id);
  if (old.length) store.history.ignore(() => store.deleteElements(old));
}
