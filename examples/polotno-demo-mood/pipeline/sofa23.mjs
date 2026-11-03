import { nb } from './nb.mjs';
import { A, LIGHT } from './slots.mjs';
const D = process.argv[2];
const KEEP = 'Keep the exact same camera, zoom and framing: every wall edge, the window, the door, the curtains and the floor pattern must stay exactly where they are. Do not change anything else and do not add anything else.';
const P = (n) => `The first image shows a room with one sofa against the left wall. Replace that sofa with the sofa from the second image, keeping its exact design, colours and fabric. Place it in the same spot along the left wall, facing right, but make it about 10% smaller than the sofa in the first image, at a realistic real-world size; its front-left end may run off the left edge of the image. It must stand firmly on the parquet, with soft realistic contact shadows and the soft shade it casts on the floor in front of and under it. ${LIGHT} ${KEEP}`;
await Promise.all([['2', 30], ['3', 32]].map(([v, m]) => nb(P(v), [`${D}/sofa-1-render.png`, A(m)], `${D}/sofa-${v}-render.png`)));
