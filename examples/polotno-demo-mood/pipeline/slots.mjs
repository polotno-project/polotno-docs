export const A = (n) => `/private/tmp/claude-501/-Users-mikhailzhuro-Documents-GitHub-polotno-website/6c23e02d-83a7-43ea-ac3d-05103a7a6b19/scratchpad/soviet-dl/x2/Foto 10-28-26, 10 35 54 (${n}).png`;
// noun: what it is in her photo; models 2 and 3 are her cut-outs (or 'Na' = an armchair matching sofa cut-out N).
export const SLOTS = {
  'wall-carpet': { noun: 'carpet hanging on the left wall', models: [38, 36] },
  rug: { noun: 'large patterned carpet on the floor', models: [37, 40] },
  'wall-unit': { noun: 'tall wooden wall unit with glass cabinets, shelves, books and ornaments that stands along the right wall, from just right of the TV cabinet to the front right edge of the photo, with the trailing plant on it (NOT the TV and NOT the low TV cabinet, leave the space where the TV cabinet stood empty)', models: [8, 11] },
  tv: { noun: 'TV standing on the low wooden TV cabinet with its lace doily and the small figurine', models: [16, 10], hint: ' Use only the TV cabinet with the TV from the right of the second image, not the bookcase.' },
  lamp: { noun: 'floor lamp with the pleated shade, which stands just behind the small side table with the plant, between the left wall and the window curtains (exactly where it is in the second image, not in the far left corner)', models: [48, 44] },
  sofa: { noun: 'sofa with its patterned cover and cushions', models: [30, 32] },
  table: { noun: 'coffee table with the small vase of flowers', models: [26, 29] },
  armchair: { noun: 'armchair', models: ['31a', '32a'], first: 34 },
};
export const SHARP = 'Ultra sharp, high-resolution real photograph with natural fine texture and film grain: matte fabrics, real wood grain. No glossy, waxy, plastic or over-smoothed surfaces.';
export const LIGHT = `Relight it to match the room exactly: warm, soft daylight coming from the window and balcony door at the back, the same colour temperature, contrast and grain as the photo. Remove any studio lighting, glossy highlights or reflections from the reference that would not exist in this room, and give it soft, realistic contact shadows. ${SHARP}`;
export const addBack = (s) => `The first image is an empty room. The second image is the same room furnished. Put back ONLY the ${s.noun} from the second image into the first image, in exactly the same position, size and perspective as in the second image. Do not add any other furniture or object. Do not change anything else in the first image: same walls, window, curtains, floor, camera and framing. ${SHARP}`;
export const addNew = (s, ref) => `The first image is an empty room. Add the ${s.noun} from the second image into the room: standing on the floor in the front right of the room, close to the camera: its front edge in the lower quarter of the image, its right side about 10% in from the right edge of the image, well in front of (and not covering) the TV cabinet area by the far right wall, turned about 45 degrees to the left so it faces the middle of the room. Real-world size: about 85 cm wide and 80 cm tall, its seat about 45 cm above the floor. It must stand firmly on the floor with its feet touching the parquet. Keep its exact design, fabric and colour. ${LIGHT} Add only this one item and change nothing else.`;
export const replace = (s, fromSofa) => (fromSofa
  ? `The first image shows a room with one armchair. Replace that armchair with an armchair from the same Soviet furniture set as the sofa in the second image: same upholstery, colour, pattern and wooden details.`
  : `The first image shows a room with one ${s.noun.split(' with ')[0]}. Replace it with the one from the second image, keeping that piece's exact design, colours, materials and pattern.${s.hint || ''}`)
  + ` Put it in exactly the same position, seen from the same camera angle, at the same scale and covering about the same area. ${LIGHT} Do not change anything else and do not add anything.`;
