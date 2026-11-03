import { nb } from './nb.mjs';
import { SLOTS, A, replace } from './slots.mjs';
const D = process.argv[2];
const jobs = [];
for (const [id, s] of Object.entries(SLOTS)) if (id !== 'armchair') s.models.forEach((m, i) => {
  const fromSofa = typeof m === 'string';
  jobs.push(nb(replace(s, fromSofa), [`${D}/${id}-1-render.png`, A(parseInt(m))], `${D}/${id}-${i + 2}-render.png`).catch((e) => console.log(id, e.message)));
});
await Promise.all(jobs);
