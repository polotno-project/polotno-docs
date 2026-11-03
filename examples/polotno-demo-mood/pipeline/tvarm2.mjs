import { nb } from './nb.mjs';
import { A, LIGHT } from './slots.mjs';
const D = process.argv[2];
const KEEP = 'Keep the exact same camera, zoom and framing: every wall edge, the window, the door, the curtains and the floor pattern must stay exactly where they are. Do not change anything else and do not add anything else.';
const TV = `The first image is an empty room. Add ONLY the small TV on its low wooden TV cabinet (with the lace doily and the small figurine) from the second image. Stand it on the floor against the back wall, directly to the right of the open balcony door, in front of the right-hand curtain, close to the door frame. It is a small, narrow cabinet: in the image it must span only from about 63% to about 72% of the image width, and its feet must touch the parquet with soft contact shadows. ${LIGHT} ${KEEP}`;
const ARM = `The first image is an empty room. Add the armchair from the second image standing on the parquet in the front right part of the room, about 2.5 m from the camera, its right side about 12% in from the right edge of the image. Rotate it so it is seen EXACTLY from the side, in pure side profile: its seat front faces straight left (90 degrees to the camera view), so we see its right side panel and right armrest square-on, its back standing on the right and its front edge on the left. We should barely see the front of the seat. Real-world size: about 85 cm deep and 80 cm tall. Keep its exact design, fabric and colour. ${LIGHT} ${KEEP}`;
await Promise.all([
  nb(TV, [`${D}/empty.png`, `${D}/clean.png`], `${D}/tvA.png`),
  nb(TV, [`${D}/empty.png`, `${D}/clean.png`], `${D}/tvB.png`),
  nb(ARM, [`${D}/empty.png`, A(34)], `${D}/armA.png`),
  nb(ARM, [`${D}/empty.png`, A(34)], `${D}/armB.png`),
]);
