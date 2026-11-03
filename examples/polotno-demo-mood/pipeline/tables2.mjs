import { nb } from './nb.mjs';
import { LIGHT } from './slots.mjs';
const D = process.argv[2];
const KEEP = 'Keep it in exactly the same position, at the same angle (its sides parallel to the original table\'s sides) and with about the same footprint on the floor. Keep the exact same camera, zoom and framing: every wall edge, the window, the door and the floor pattern must stay exactly where they are. Do not change anything else and do not add anything else.';
const DESIGNS = {
  a: 'a Soviet 1970s low OVAL coffee table in honey-coloured polished veneer with four splayed tapered legs and a small crystal ashtray on it',
  b: 'a Soviet 1980s rectangular coffee table with a dark walnut frame, a lower magazine shelf with a few magazines, square straight legs, and a cut-crystal vase on top',
  c: 'a Soviet 1960s coffee table with a light birch top on thin black metal hairpin legs and a ceramic teapot on it',
};
await Promise.all(Object.entries(DESIGNS).map(([k, d]) => nb(`The image shows a room with one coffee table. Replace that table with a completely different design: ${d}. ${LIGHT} ${KEEP}`, [`${D}/table-1-render.png`], `${D}/tnew-${k}.png`)));
