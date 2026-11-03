import { nb } from './nb.mjs';
import { A, SLOTS, replace } from './slots.mjs';
const D = process.argv[2];
const KEEP = ' Keep it in pure side profile facing left, exactly like the armchair in the first image. Keep the exact same camera, zoom and framing; every wall edge, the window, the door and the floor pattern must stay exactly where they are.';
await Promise.all(SLOTS.armchair.models.map((m, i) => nb(replace(SLOTS.armchair, true) + KEEP, [`${D}/armchair-1-render.png`, A(parseInt(m))], `${D}/armchair-${i + 2}-render.png`)));
