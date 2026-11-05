// Jewelry parts as Polotno elements.
//
// Every part is an SVG element with its recipe in `custom`: which shank,
// cut, stone or metal it is. The drawing is always rebuilt from the recipe,
// so changing a stone or metal swaps the SVG and keeps the part where it is.
//
//   shank   { kind, shank, metal, finish, scale }   scale = band width factor
//   gem     { kind, cut, stone, size }          size = length in mm
//   setting { kind, setting, metal, gemId }     follows its stone
//   pave    { kind, count, size, stone, metal, bend }

import { reaction } from 'mobx';
import { gemSvg, gemSizeMm, paveSvg } from './gems.js';
import { shankPart, settingPart, beadColors } from './metal.js';

// The canvas works in millimetres. 1200 dpi keeps a 1 mm pavé stone sharp.
export const DPI = 1200;
export const PX = DPI / 25.4; // px per mm
export const PAGE_MM = { width: 40, height: 30 };

export const kindOf = (el) => el?.custom?.kind;

// --- geometry helpers ------------------------------------------------------------

export function centerOf(el) {
  const a = (el.rotation * Math.PI) / 180;
  return {
    x: el.x + (el.width / 2) * Math.cos(a) - (el.height / 2) * Math.sin(a),
    y: el.y + (el.width / 2) * Math.sin(a) + (el.height / 2) * Math.cos(a),
  };
}

// x/y that put an element of this size and rotation centred on `c`.
export function boxAt(c, width, height, rotation) {
  const a = (rotation * Math.PI) / 180;
  return {
    x: c.x - (width / 2) * Math.cos(a) + (height / 2) * Math.sin(a),
    y: c.y - (width / 2) * Math.sin(a) - (height / 2) * Math.cos(a),
    width,
    height,
  };
}

// --- recipes -> drawings ------------------------------------------------------------

export function drawingFor(custom) {
  switch (custom.kind) {
    case 'shank': {
      const p = shankPart(custom.shank, custom.metal, custom.finish);
      return { src: p.src, width: p.width * PX, height: p.height * (custom.scale || 1) * PX };
    }
    case 'gem': {
      const { width, height } = gemSizeMm(custom.cut, custom.size);
      // the drawing has a hairline of padding around the stone
      return { src: gemSvg(custom.cut, custom.stone), width: width * PX, height: height * PX };
    }
    case 'setting': {
      const { width, height } = gemSizeMm(custom.cut, custom.size);
      const p = settingPart(custom.setting, custom.metal, custom.cut, width, height);
      return { src: p.src, width: p.width * PX, height: p.height * PX };
    }
    case 'pave': {
      const p = paveSvg({ count: custom.count, stoneId: custom.stone, beadColor: beadColors(custom.metal), bend: custom.bend });
      return { src: p.src, width: p.widthUnits * custom.size * PX, height: p.heightUnits * custom.size * PX };
    }
    default:
      return null;
  }
}

// Padding around a part inside its element box, in px per side. Stones,
// shanks and pavé are cropped tight, so only settings have any.
export function paddingOf(el) {
  const c = el.custom || {};
  if (c.kind === 'setting') return { x: 0.4 * PX, y: 0.4 * PX };
  return { x: 0, y: 0 };
}

// Turn a part round its own centre, the way a jeweler expects; Polotno's
// rotation pivots on the top-left corner.
export function rotateAroundCenter(el, rotation) {
  el.set({ rotation, ...boxAt(centerOf(el), el.width, el.height, rotation) });
}

// Bands cast a soft contact shadow on the sheet, so they sit on it rather
// than float. Sizes are in px at 1200 dpi: a 0.6 mm blur, 0.3 mm down.
const BAND_SHADOW = {
  shadowEnabled: true,
  shadowBlur: 0.6 * PX,
  shadowOffsetX: 0,
  shadowOffsetY: 0.3 * PX,
  shadowColor: '#000000',
  shadowOpacity: 0.45,
};

const NAMES = { shank: 'Shank', gem: 'Stone', setting: 'Setting', pave: 'Pavé row' };

export function addPart(store, custom, { at, rotation = 0, select = true } = {}) {
  const page = store.activePage;
  const d = drawingFor(custom);
  const c = at || { x: store.width / 2, y: store.height / 2 };
  const el = page.addElement({
    type: 'svg',
    name: NAMES[custom.kind],
    src: d.src,
    rotation,
    ...boxAt(c, d.width, d.height, rotation),
    keepRatio: true,
    ...(custom.kind === 'shank' ? BAND_SHADOW : {}),
    custom,
  });
  if (select) store.selectElements([el.id]);
  return el;
}

// Change part of a recipe and redraw in place. Size changes come from the
// recipe, so a stone's mm size stays exact.
export function updatePart(el, patch) {
  const custom = { ...el.custom, ...patch };
  const d = drawingFor(custom);
  el.set({ src: d.src, custom, ...boxAt(centerOf(el), d.width, d.height, el.rotation) });
}

// --- settings follow their stones -----------------------------------------------------

export const settingOf = (page, gem) => page.children.find((e) => kindOf(e) === 'setting' && e.custom.gemId === gem.id);

// Recipe for a setting that fits a stone recipe.
export const applySettingCustom = (gemCustom, settingId, metal) => ({
  kind: 'setting',
  setting: settingId,
  metal,
  cut: gemCustom.cut,
  size: gemCustom.size,
});

export function applySetting(store, gem, settingId, metal) {
  const page = store.activePage;
  const current = settingOf(page, gem);
  if (!settingId) {
    if (current) store.deleteElements([current.id]);
    return;
  }
  const custom = { ...applySettingCustom(gem.custom, settingId, metal), gemId: gem.id };
  if (current) {
    updatePart(current, custom);
    return;
  }
  const el = addPart(store, custom, { at: centerOf(gem), rotation: gem.rotation, select: false });
  // A setting can't be picked on its own: it's edited through its stone.
  el.set({ selectable: false, draggable: false });
  page.moveElementsTop([el.id]);
}

// Keep every setting on top of its stone: same centre, rotation and size.
// Runs outside undo history, so one undo moves the stone and its setting.
export function syncSettings(store) {
  return reaction(
    () =>
      store.pages.flatMap((page) =>
        page.children
          .filter((e) => kindOf(e) === 'setting')
          .map((s) => {
            const gem = page.children.find((e) => e.id === s.custom.gemId);
            return gem
              ? [s.id, gem.x, gem.y, gem.rotation, gem.width, gem.height, gem.custom.cut, gem.custom.size, gem.visible].join('|')
              : `${s.id}|gone`;
          }),
      ).join(';'),
    () => {
      store.history.ignore(() => {
        for (const page of store.pages) {
          for (const s of page.children.filter((e) => kindOf(e) === 'setting')) {
            const gem = page.children.find((e) => e.id === s.custom.gemId);
            if (!gem) {
              store.deleteElements([s.id]);
              continue;
            }
            const custom = { ...s.custom, cut: gem.custom.cut, size: gem.custom.size };
            const same = custom.cut === s.custom.cut && custom.size === s.custom.size;
            const d = same ? { src: s.src, width: s.width, height: s.height } : drawingFor(custom);
            s.set({ src: d.src, custom, rotation: gem.rotation, visible: gem.visible, ...boxAt(centerOf(gem), d.width, d.height, gem.rotation) });
          }
        }
      });
    },
  );
}

// --- whole design ------------------------------------------------------------------------

export const metalParts = (page) => page.children.filter((e) => ['shank', 'setting', 'pave'].includes(kindOf(e)));

export function setAllMetal(store, metal) {
  for (const el of metalParts(store.activePage)) updatePart(el, { metal });
}

// The design as plain data, in millimetres. This is what a render or
// manufacturing pipeline reads, next to the PNG.
export function designData(store) {
  const page = store.activePage;
  const mm = (v) => Math.round((v / PX) * 100) / 100;
  return page.children
    .filter((e) => kindOf(e) && kindOf(e) !== 'grid')
    .map((e) => {
      const c = centerOf(e);
      return { ...e.custom, x: mm(c.x), y: mm(c.y), rotation: Math.round(e.rotation) };
    });
}

// A plain-English summary for the AI render prompt.
export function describe(store) {
  const items = designData(store);
  const metals = [...new Set(items.filter((i) => i.metal).map((i) => i.metal))];
  const metalName = { white: 'white gold', yellow: 'yellow gold', rose: 'rose gold' };
  const gems = items.filter((i) => i.kind === 'gem');
  const shank = items.find((i) => i.kind === 'shank');
  const shankName = {
    classic: 'a classic band', tapered: 'a tapered band', knife: 'a knife-edge band', cathedral: 'a cathedral band',
    split: 'a split shank', bypass: 'a bypass shank', bow: 'a bow-shaped band', channel: 'a channel band',
  };
  const parts = [];
  parts.push(`a ${metals.map((m) => metalName[m]).join(' and ') || 'gold'} ring`);
  if (shank) parts.push(`on ${shankName[shank.shank]}`);
  if (gems.length) {
    const byKind = {};
    for (const g of gems) {
      const key = `${g.cut} ${g.stone}`;
      byKind[key] = (byKind[key] || 0) + 1;
    }
    const list = Object.entries(byKind).map(([k, n]) => (n > 1 ? `${n} ${k}s` : `${/^[aeiou]/.test(k) ? 'an' : 'a'} ${k}`));
    parts.push(`set with ${list.join(', ')}`);
  }
  const settings = [...new Set(items.filter((i) => i.kind === 'setting').map((i) => i.setting))];
  const settingName = { prong4: 'four-prong', prong6: 'six-prong', bezel: 'bezel', halo: 'halo' };
  if (settings.length) parts.push(`in ${settings.map((s) => settingName[s]).join(' and ')} settings`);
  if (items.some((i) => i.kind === 'pave')) parts.push('with rows of pavé diamonds');
  return parts.join(' ');
}

// --- starter designs -----------------------------------------------------------------------

// Each starter is a list of parts with centres in mm from the page centre.
export const STARTERS = [
  {
    id: 'three-stone',
    label: 'Three stone',
    parts: [
      { custom: { kind: 'shank', shank: 'tapered', metal: 'white' } },
      { custom: { kind: 'gem', cut: 'round', stone: 'diamond', size: 6.5 }, setting: 'prong4' },
      { custom: { kind: 'gem', cut: 'round', stone: 'diamond', size: 4.5 }, at: [-5.9, 0], setting: 'prong4' },
      { custom: { kind: 'gem', cut: 'round', stone: 'diamond', size: 4.5 }, at: [5.9, 0], setting: 'prong4' },
    ],
  },
  {
    id: 'halo',
    label: 'Oval halo',
    parts: [
      { custom: { kind: 'shank', shank: 'channel', metal: 'rose' } },
      { custom: { kind: 'pave', count: 7, size: 1.3, stone: 'diamond', metal: 'rose', bend: 0 }, at: [-8.6, 0] },
      { custom: { kind: 'pave', count: 7, size: 1.3, stone: 'diamond', metal: 'rose', bend: 0 }, at: [8.6, 0] },
      { custom: { kind: 'gem', cut: 'oval', stone: 'diamond', size: 7.5 }, setting: 'halo' },
    ],
  },
  {
    id: 'bow',
    label: 'Bow',
    parts: [
      { custom: { kind: 'shank', shank: 'bow', metal: 'white' } },
      { custom: { kind: 'pave', count: 7, size: 1, stone: 'diamond', metal: 'white', bend: 0.4 }, at: [-5.6, -2.2], rotation: 11 },
      { custom: { kind: 'pave', count: 7, size: 1, stone: 'diamond', metal: 'white', bend: 0.4 }, at: [5.6, -2.2], rotation: -11 },
      { custom: { kind: 'pave', count: 7, size: 1, stone: 'diamond', metal: 'white', bend: -0.4 }, at: [-5.6, 2.2], rotation: -11 },
      { custom: { kind: 'pave', count: 7, size: 1, stone: 'diamond', metal: 'white', bend: -0.4 }, at: [5.6, 2.2], rotation: 11 },
      { custom: { kind: 'gem', cut: 'round', stone: 'diamond', size: 5.5 }, setting: 'prong6' },
      { custom: { kind: 'gem', cut: 'round', stone: 'diamond', size: 3.2 }, at: [-5, 0], setting: 'prong4' },
      { custom: { kind: 'gem', cut: 'round', stone: 'diamond', size: 3.2 }, at: [5, 0], setting: 'prong4' },
    ],
  },
  {
    id: 'emerald',
    label: 'Emerald solitaire',
    parts: [
      { custom: { kind: 'shank', shank: 'cathedral', metal: 'yellow' } },
      { custom: { kind: 'gem', cut: 'emerald', stone: 'emerald', size: 8 }, setting: 'prong4' },
    ],
  },
  {
    id: 'bypass',
    label: 'Sapphire bypass',
    parts: [
      { custom: { kind: 'shank', shank: 'bypass', metal: 'white' } },
      { custom: { kind: 'gem', cut: 'pear', stone: 'sapphire', size: 6 }, at: [-1.4, -1.6], rotation: -30, setting: 'prong6' },
      { custom: { kind: 'gem', cut: 'round', stone: 'diamond', size: 4.5 }, at: [1.8, 1.8], setting: 'bezel' },
    ],
  },
];

export function loadStarter(store, starterId) {
  const starter = STARTERS.find((s) => s.id === starterId);
  const page = store.activePage;
  store.history.transaction(() => {
    store.deleteElements(page.children.filter((e) => kindOf(e) !== 'grid').map((e) => e.id));
    for (const p of starter.parts) {
      const [dx, dy] = p.at || [0, 0];
      const el = addPart(store, p.custom, {
        at: { x: store.width / 2 + dx * PX, y: store.height / 2 + dy * PX },
        rotation: p.rotation || 0,
        select: false,
      });
      if (p.setting) {
        const metal = starter.parts.find((q) => q.custom.metal)?.custom.metal || 'white';
        applySetting(store, el, p.setting, metal);
      }
    }
    store.selectElements([]);
  });
}
