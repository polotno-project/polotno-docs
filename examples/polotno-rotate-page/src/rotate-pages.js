import { forEveryChild } from 'polotno/model/group-model';

export function rotatePages(store) {
  const pages = store.pages.map((page) => ({
    page,
    width: page.width,
    height: page.height,
    computedHeight: page.computedHeight,
  }));
  store.setSize(store.height, store.width);

  pages.forEach(({ page, width, height, computedHeight }) => {
    // Preserve page overrides and dimensions inherited from the store.
    page.set({ width: height, height: width });
    forEveryChild(page, (element) => {
      if (element.type === 'group') return;
      element.set({
        x: computedHeight - element.y,
        y: element.x,
        rotation: (element.rotation || 0) + 90,
      });
    });
  });
}
