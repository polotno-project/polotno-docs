import { nb } from './nb.mjs';
import { LIGHT } from './slots.mjs';
const D = process.argv[2];
const P = `The image shows a room with one coffee table. Restyle ONLY that table: make it a dark polished walnut Soviet coffee table with slightly tapered legs, keeping EXACTLY the same shape, size, proportions, position and angle as the table in the image (same outline, same leg positions). Replace the objects on it with a long cream lace runner and one cut-crystal bowl. ${LIGHT} Keep the exact same camera, zoom and framing: every wall edge, the window, the door and the floor pattern must stay exactly where they are. Do not change anything else and do not add anything.`;
await Promise.all(['a', 'b'].map((n) => nb(P, [`${D}/table-1-render.png`], `${D}/table-3${n}-render.png`)));
