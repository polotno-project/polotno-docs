import { nb } from './nb.mjs';
import { SLOTS, A, addBack, addNew } from './slots.mjs';
const D = process.argv[2];
await Promise.all(Object.entries(SLOTS).map(([id, s]) => (s.first
  ? nb(addNew(s), [`${D}/empty.png`, A(s.first)], `${D}/${id}-1-render.png`)
  : nb(addBack(s), [`${D}/empty.png`, `${D}/clean.png`], `${D}/${id}-1-render.png`)).catch((e) => console.log(id, e.message))));
