// Flow helpers: the canvas is free-form, but content and blocks are added like
// in an email builder – below the selection (or at the end), pushing what lies
// under it down and growing the page.

export const DESKTOP_WIDTH = 600;
export const MOBILE_WIDTH = 350;
export const PAD = 40;

let uid = 0;
export const id = (p = 'el') => `${p}-${Date.now().toString(36)}-${(uid++).toString(36)}`;

// A group has no position of its own: its children are placed on the page.
const topOf = (el) => (el.type === 'group' ? Math.min(...el.children.map(topOf)) : el.y);
const bottomOf = (el) => (el.type === 'group' ? Math.max(...el.children.map(bottomOf)) : el.y + el.height);
const shift = (el, dy) => (el.type === 'group' ? el.children.forEach((c) => shift(c, dy)) : el.set({ y: el.y + dy }));

export function contentBottom(page) {
  return page.children.reduce((m, el) => Math.max(m, bottomOf(el)), 0);
}

// Where new content goes: under the selected element on this page, else the end.
export function insertionY(store, page) {
  const sel = store.selectedElements.filter((el) => el.page === page);
  if (sel.length) return Math.max(...sel.map(bottomOf));
  return page.height;
}

// Make room for `height` px at `y`: move everything below down, stretch
// full-width section backgrounds that span `y`, and grow the page.
export function makeRoom(page, y, height) {
  page.children.forEach((el) => {
    if (topOf(el) >= y - 0.5) {
      shift(el, height);
    } else if (el.type === 'figure' && el.width >= page.computedWidth * 0.9 && bottomOf(el) > y) {
      el.set({ height: el.height + height });
    }
  });
  page.set({ height: page.computedHeight + height });
}

// Elements are described relative to (0, 0) with the block's own height; they
// land at `y` once there is room for them.
export function insertBlock(store, page, block) {
  const y = insertionY(store, page);
  const atEnd = y >= page.computedHeight - 0.5;
  // At the end of the page there is nothing to push: just grow.
  if (atEnd) page.set({ height: page.computedHeight + block.height });
  else makeRoom(page, y, block.height);
  const ids = [];
  block.elements.forEach((el) => {
    const elId = el.id || id();
    page.addElement({ ...el, id: elId, y: el.y + y }, { skipSelect: true });
    ids.push(elId);
  });
  (block.groups || []).forEach((groupIds) => store.groupElements(groupIds));
  // What landed on the page itself: the new groups, and the elements not in one.
  const isNew = (el) => ids.includes(el.id) || (el.type === 'group' && el.children.some(isNew));
  return page.children.filter(isNew);
}

export function fitHeight(page) {
  const bottom = contentBottom(page);
  if (bottom > 0) page.set({ height: Math.ceil(bottom) });
}
