// Light / dark theme. The chrome follows the `--pn-*` tokens in theme.css;
// the work area follows CANVAS here, set as the page background so it is
// also what exports and renders show behind the ring.

import { observable, runInAction } from 'mobx';
import { ensureGrid } from './grid.js';

// The work area: one colour inside and out. The 40 x 30 mm sheet is marked
// by a 1 px line in the panel-divider colour, drawn in frame.jsx.
export const CANVAS = { dark: '#0a0a0c', light: '#f1ede6' };
export const SURROUND = CANVAS;


// Selection and hover in the theme's gold rather than Polotno's blue, kept
// faint and fine: the parts are small and delicate.
export const SELECTION = { dark: '#c9a45c', light: '#a8823e' };
export const SELECTION_SOFT = { dark: '#d4b06a', light: '#8f6c2e' };
export const HOVER = { dark: 'rgba(212,176,106,0.75)', light: 'rgba(143,108,46,0.7)' };

const initial = (() => {
  const t = document.documentElement.dataset.theme;
  return t === 'light' ? 'light' : 'dark';
})();

export const theme = observable({ name: initial });

function applyToDocument(t) {
  const root = document.documentElement;
  root.dataset.theme = t;
  // Polotno's primitives also key some styles off a `dark` class.
  root.classList.toggle('dark', t === 'dark');
  try {
    localStorage.setItem('jw-theme', t);
  } catch {}
}
applyToDocument(initial);

// On screen the sheet is transparent, so the workspace's one dot grid shows
// across the whole area. Exports and render snapshots need a solid
// background, so it's filled in for the moment of the export only.
export async function withSolidBackground(store, fn) {
  const page = store.activePage;
  store.history.ignore(() => page.set({ background: CANVAS[theme.name] }));
  try {
    return await fn();
  } finally {
    store.history.ignore(() => page.set({ background: 'transparent' }));
  }
}

export function setTheme(store, t) {
  applyToDocument(t);
  runInAction(() => (theme.name = t));
  ensureGrid(store, t);
}
