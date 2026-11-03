// Runs new-model.mjs for every model in models.json, a few at a time.
//   node new-models.mjs <example dir> <work dir> [<id>…]
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const [, , P, WORK, ...only] = process.argv;
const models = JSON.parse(fs.readFileSync(new URL('./models.json', import.meta.url), 'utf8')).filter(([, id]) => !only.length || only.includes(id));
const script = new URL('./new-model.mjs', import.meta.url).pathname;
const run = ([slot, id, description, colour]) => new Promise((ok) => execFile('node', [script, P, WORK, slot, id, description, ...(colour ? ['colour'] : [])], { maxBuffer: 1e8 },
  (e, out, err) => { console.log(e ? `${id} FAILED ${err.slice(-300)}` : out.trim().split('\n').pop()); ok(); }));
const queue = [...models];
await Promise.all(Array.from({ length: 5 }, async () => { while (queue.length) await run(queue.shift()); }));
