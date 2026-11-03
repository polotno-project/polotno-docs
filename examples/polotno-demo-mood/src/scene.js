// The rooms and everything that can go in them.
//
// Each room is an empty photo plus slots: fixed spots where a piece can stand,
// each with a few styles. Every piece and its shadow were cut from a Nano
// Banana Pro render of that piece in that room, so they share its camera and
// light. Boxes are in room pixels.
//
// `colour` points at a mask of the parts that take a colour (fabric, not legs
// or throw pillows). Pieces without one keep their own colours.

import soviet from './soviet.json';
// Positions and sizes set by hand in admin mode (?admin=1), by style id.
import layout from './layout.json';
// Test shadows (zone-shadow.mjs, drawn-shadow.mjs), shown next to the current
// ones as extra styles of the same piece, by style id.
import shadowTests from './shadow-tests.json';
// Materials per style (pipeline/materials.mjs): the same model in another
// fabric or finish. Pieces carry their own cut-out box; wall units are room photos.
import materials from './materials.json';
// Bucket keys for the room's pictures (pipeline/upload-assets.mjs).
import cdn from './cdn.json';

// The built demo loads the room's pictures through polotno.com's /mood-assets
// rewrite, so they stay same-origin; the dev server serves them from public/.
export const asset = (path) => {
  const key = import.meta.env.PROD && cdn[path.split('?')[0]];
  return key ? `/mood-assets/${key}` : `${import.meta.env.BASE_URL}${path}`;
};

// Each piece and its shadow are cut from one Nano Banana Pro render of the piece in
// this room, so they line up and the piece carries the room's real light. The
// shadow is black with alpha, drawn above the rug and below every piece, so it
// darkens whatever floor is there. Boxes are in room pixels.
const SHADOWS = {
  'back-sofa-1': { x: 282, y: 720, width: 2033, height: 863 },
  'table-1': { x: 806, y: 1227, width: 997, height: 417 },
  'table-2': { x: 803, y: 1233, width: 991, height: 411 },
  'table-3': { x: 758, y: 1234, width: 1077, height: 410 },
  'back-sofa-2': { x: 290, y: 714, width: 2027, height: 883 },
  'back-sofa-3': { x: 217, y: 714, width: 2145, height: 882 },
  'left-sofa-1': { x: 12, y: 695, width: 1141, height: 957 },
  'left-sofa-2': { x: 12, y: 680, width: 1147, height: 971 },
  'left-sofa-3': { x: 12, y: 707, width: 1184, height: 944 },
  'plant-1': { x: 1681, y: 621, width: 793, height: 1022 },
  'plant-2': { x: 1886, y: 742, width: 513, height: 896 },
  'plant-3': { x: 1879, y: 753, width: 524, height: 890 },
};

// Bumped whenever the baked pieces change, so browsers drop cached copies.
const V = '?v=6';

const item = (id, x, y, width, height, colour = false) => ({
  id,
  src: `scene/${id}.webp${V}`,
  colour: colour ? `scene/${id}-colour.png` : null,
  box: { x, y, width, height },
  shadow: SHADOWS[id] ? { src: `scene/${id}-shadow.webp${V}`, box: SHADOWS[id] } : null,
});

// Back to front: later slots are drawn over earlier ones. `spot` is where the
// + marker sits while the slot is empty. Slots marked `beforeShadows` sit under
// the merged shadow layer (rugs, things flat on the wall), the rest above it.
const SCANDI_SLOTS = [
  {
    id: 'rug',
    spot: { x: 760, y: 1560 },
    label: 'Rug',
    shadow: false,
    beforeShadows: true,
    items: [item('rug', 410, 1320, 1960, 311, true)],
  },
  {
    id: 'plant',
    spot: { x: 2160, y: 1000 },
    label: 'Plant',
    shadow: true,
    items: [
      item('plant-1', 1908, 492, 504, 831),
      item('plant-2', 2000, 703, 321, 620),
      item('plant-3', 1994, 723, 331, 600),
    ],
  },
  {
    id: 'sofa',
    spot: { x: 1421, y: 1080 },
    label: 'Sofa',
    shadow: true,
    items: [
      item('back-sofa-1', 844, 879, 1154, 449, true),
      item('back-sofa-2', 852, 879, 1148, 459, true),
      item('back-sofa-3', 813, 879, 1216, 455, true),
    ],
  },
  {
    id: 'table',
    spot: { x: 1368, y: 1300 },
    label: 'Table',
    shadow: true,
    items: [
      item('table-1', 1078, 1146, 584, 344, true),
      item('table-2', 1068, 1154, 573, 364),
      item('table-3', 1047, 1153, 625, 340),
    ],
  },
  {
    id: 'side',
    spot: { x: 518, y: 1230 },
    label: 'Side sofa',
    shadow: true,
    items: [
      item('left-sofa-1', 97, 929, 833, 621, true),
      item('left-sofa-2', 93, 923, 839, 640, true),
      item('left-sofa-3', 108, 940, 863, 619, true),
    ],
  },
];

// The Soviet room (80s–90s flat): the client's own reference photo, tidied and
// emptied, with its original pieces as the first style of each slot and her
// reference cut-outs as the others. See soviet.json for the boxes. The wall
// unit runs into the photo's edge, so each of its styles is the whole room
// photo with that unit in it (`background`) rather than a cut-out.
const SV = '?v=44';
const MATERIAL_LABELS = {
  velour: 'Velour', jacquard: 'Jacquard', tweed: 'Tweed', leatherette: 'Leatherette', chenille: 'Chenille',
  walnut: 'Walnut', birch: 'Birch', oak: 'Dark oak', mahogany: 'Mahogany', white: 'White',
};
const byLabelOrder = (ids) => Object.keys(MATERIAL_LABELS).filter((m) => ids.includes(m));
// A piece cut off by the photo's edge (a sofa running out of frame) keeps that
// edge on the frame when it's resized, or the cut would show.
const pinToFrame = (box, base) => {
  const b = { ...box };
  if (base.y + base.height >= soviet.height && b.y + b.height < soviet.height) b.y = soviet.height - b.height;
  if (base.x <= 0 && b.x > 0) b.x = 0;
  if (base.x + base.width >= soviet.width && b.x + b.width < soviet.width) b.x = soviet.width - b.width;
  return b;
};
const FLAT = ['wall-carpet'];
const SOVIET_SLOTS = [
  {
    ...soviet.wallUnit,
    background: true,
    beforeShadows: true,
    shadow: false,
    items: soviet.wallUnit.items.map((i) => ({
      id: i.id,
      src: `${i.thumb}${SV}`,
      room: `${i.src}${SV}`,
      colour: null,
      shadow: null,
      materials: byLabelOrder(Object.keys(materials[i.id] || {})).map((m) => ({ id: m, label: MATERIAL_LABELS[m], room: `${i.src.replace('.webp', `-${m}.webp`)}${SV}` })),
    })),
  },
  ...soviet.slots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    spot: slot.spot,
    beforeShadows: slot.beforeShadows,
    // A carpet hung flat on the wall casts next to no shadow, and its baked
    // one only picked up redrawn wallpaper.
    shadow: !FLAT.includes(slot.id),
    items: slot.items.flatMap((i) => {
      // `colour` in soviet.json: the fabric takes a colour (a mask of it, per
      // material too).
      const masked = !!i.colour;
      const item = {
        id: i.id,
        src: `soviet/${i.id}.webp${SV}`,
        colour: masked ? `soviet/${i.id}-mask.png${SV}` : null,
        box: pinToFrame(layout[i.id] || i.box, i.box),
        // Where the piece was cut; its shadow is placed relative to this.
        baseBox: i.box,
        shadow: FLAT.includes(slot.id) ? null : { src: `soviet/${i.id}-shadow.webp${SV}`, box: i.shadow },
        materials: byLabelOrder(Object.keys(materials[i.id] || {})).map((m) => [m, materials[i.id][m]]).map(([m, v]) => ({
          id: m,
          label: MATERIAL_LABELS[m],
          src: `soviet/${i.id}-${m}.webp${SV}`,
          colour: masked ? `soviet/${i.id}-${m}-mask.png${SV}` : null,
          baseBox: v.box,
        })),
      };
      // s2: AI shadow kept to a zone around the piece; s3: drawn from its outline.
      const tests = Object.entries(shadowTests[i.id] || {});
      return [item, ...tests.map(([v, box]) => ({ ...item, id: `${i.id}-${v}`, box: pinToFrame(layout[`${i.id}-${v}`] || item.box, i.box), shadow: { src: `soviet/${i.id}-${v}-shadow.webp${SV}`, box } }))];
    }),
  })),
];

// The room picker. Only the Soviet room for now; the Scandi slots above are
// kept for when it comes back.
export const ROOMS = [
  {
    id: 'soviet',
    label: 'Soviet',
    thumb: `soviet/thumb.webp${SV}`,
    width: soviet.width,
    height: soviet.height,
    src: `${soviet.src}${SV}`,
    slots: SOVIET_SLOTS,
  },
];

export const roomById = (id) => ROOMS.find((r) => r.id === id);

// Soviet-era upholstery colours: dusty and faded, the way dyed cotton and
// wool of the time looked, not bright modern fabric.
const UPHOLSTERY = [
  { name: 'Burgundy', rgb: [100, 42, 46] },
  { name: 'Bottle green', rgb: [48, 72, 60] },
  { name: 'Mustard', rgb: [128, 92, 48] },
  { name: 'Rust', rgb: [138, 82, 58] },
  { name: 'Brown', rgb: [96, 70, 55] },
  { name: 'Beige', rgb: [138, 126, 108] },
  { name: 'Grey-blue', rgb: [98, 108, 118] },
  { name: 'Olive', rgb: [100, 98, 66] },
  { name: 'Terracotta', rgb: [150, 96, 80] },
  { name: 'Cream', rgb: [160, 152, 134] },
];

const WOOD = [
  { name: 'Whitewash', rgb: [235, 230, 220] },
  { name: 'Walnut', rgb: [95, 62, 40] },
  { name: 'Espresso', rgb: [60, 38, 28] },
  { name: 'Black', rgb: [28, 27, 27] },
];

export const coloursFor = (slotId) => (slotId === 'table' ? WOOD : UPHOLSTERY);

// Polotno's own drop shadow: a soft, slightly lowered copy of the outline.
// Not a floor shadow, but it moves with the piece and grounds it a little.
export const SOFT_SHADOW = {
  shadowEnabled: true,
  shadowColor: 'rgb(40,30,20)',
  shadowBlur: 45,
  shadowOffsetX: 0,
  shadowOffsetY: 14,
  shadowOpacity: 0.35,
};
