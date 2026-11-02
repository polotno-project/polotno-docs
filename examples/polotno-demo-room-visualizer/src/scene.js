// The room and everything that can go in it.
//
// The room photo was split into layers (empty room, rug, two sofas, table,
// plant) with Seedream layer decomposition. The extra styles were made by
// asking Nano Banana Pro to replace the piece in the room photo itself, so each
// one matches the room's camera and daylight, then cut out. Boxes are in room
// pixels.
//
// `colour` points at a mask of the parts that take a colour (fabric, not legs
// or throw pillows). Pieces without one keep their own colours.

export const ROOM = { width: 2496, height: 1664, src: 'scene/room.webp' };

// The room picker. The first room is the one built above. The second is a
// furnished photo that would be split into layers with AI; in the public demo
// that step is switched off. `mask` covers the pieces the split would find.
export const ROOMS = [
  {
    id: 'scandi',
    label: 'Scandi',
    blurb: 'An empty room you furnish piece by piece',
    thumb: 'rooms/room-1-thumb.webp',
  },
  {
    id: 'sage',
    label: 'Sage',
    blurb: 'A furnished photo, split into layers with AI',
    thumb: 'rooms/room-2-thumb.webp',
    src: 'rooms/room-2.webp',
    mask: 'rooms/room-2-mask.png',
  },
];

export const asset = (path) => `${import.meta.env.BASE_URL}${path}`;

const item = (id, x, y, width, height, colour = false) => ({
  id,
  src: `scene/${id}.webp`,
  colour: colour ? `scene/${id}-colour.png` : null,
  box: { x, y, width, height },
});

// Back to front: later slots are drawn over earlier ones. `spot` is where the
// + marker sits while the slot is empty.
export const SLOTS = [
  {
    id: 'rug',
    spot: { x: 760, y: 1560 },
    label: 'Rug',
    shadow: false,
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
      item('back-sofa-1', 845, 877, 1152, 453, true),
      item('back-sofa-2', 851, 876, 1148, 463, true),
      item('back-sofa-3', 812, 876, 1216, 462, true),
    ],
  },
  {
    id: 'table',
    spot: { x: 1368, y: 1300 },
    label: 'Table',
    shadow: true,
    items: [
      item('table-1', 1076, 1144, 585, 349, true),
      item('table-2', 1067, 1151, 574, 370),
      item('table-3', 1046, 1150, 626, 344),
    ],
  },
  {
    id: 'side',
    spot: { x: 518, y: 1230 },
    label: 'Side sofa',
    shadow: true,
    items: [
      item('left-sofa-1', 103, 926, 830, 626, true),
      item('left-sofa-2', 98, 920, 839, 650, true),
      item('left-sofa-3', 113, 937, 862, 625, true),
    ],
  },
];

export const slotById = (id) => SLOTS.find((s) => s.id === id);

const UPHOLSTERY = [
  { name: 'Sage', rgb: [135, 150, 120] },
  { name: 'Terracotta', rgb: [180, 95, 65] },
  { name: 'Mustard', rgb: [196, 150, 40] },
  { name: 'Blush', rgb: [215, 170, 160] },
  { name: 'Cognac', rgb: [150, 85, 45] },
  { name: 'Navy', rgb: [40, 55, 90] },
  { name: 'Forest', rgb: [45, 80, 60] },
  { name: 'Charcoal', rgb: [70, 70, 72] },
  { name: 'Black', rgb: [28, 27, 27] },
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
