// Tidy room (her furniture, no mess) and empty room (her wallpaper), both straight from her photo, in 4K.
import { nb } from './nb.mjs';
const D = process.argv[2];
const A = (n) => `/private/tmp/claude-501/-Users-mikhailzhuro-Documents-GitHub-polotno-website/6c23e02d-83a7-43ea-ac3d-05103a7a6b19/scratchpad/soviet-dl/x2/Foto 10-28-26, 10 35 54 (${n}).png`;
const SHARP = 'Ultra sharp, high-resolution real photograph with natural fine texture and film grain: matte wallpaper, matte fabrics, real wood grain. No glossy, waxy, plastic or over-smoothed surfaces, no HDR look.';
const TIDY = `Tidy up this photo of a Soviet living room: remove all the mess (the clothes and blankets piled on the sofa, books, remote, papers, socks, teddy bear, toy block, cups, plates, crumbs, the spilled tea, the tissue box and small box on the table, the fallen wooden chair and the debris on the floor and balcony). Keep the sofa's patterned cover neat with two cushions, and a small vase of flowers on the coffee table. Keep everything else exactly as it is, in exactly the same place, size and perspective, same camera and framing. Soft, even, warm daylight from the window. ${SHARP}`;
const EMPTY = `Make this exact room EMPTY of furniture, as if the family just moved out: remove the sofa, the carpet on the left wall, the floor lamp, the coffee table, the floor carpet (show the herringbone parquet underneath), the TV and TV cabinet, the tall wall unit on the right, the fallen chair and all the mess. Re-paper all the walls with the wallpaper from the second image (cream damask, each motif about 15 cm, following each wall's perspective). KEEP exactly as they are and where they are: the portrait on the wall, the small side table with the plant in the left corner, the window with its tulle and curtains, the plants on the sill, the radiator, the balcony door and balcony, the parquet floor, the skirting, the ceiling. Same camera, framing and perspective. Soft, even, warm daylight from the window, no hard sun patches. ${SHARP}`;
await Promise.all([
  nb(TIDY, [`${D}/photo.webp`], `${D}/clean.png`),
  nb(EMPTY, [`${D}/photo.webp`, A(2)], `${D}/empty-a.png`),
  nb(EMPTY, [`${D}/photo.webp`, A(2)], `${D}/empty-b.png`),
]);
