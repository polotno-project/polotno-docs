// Uploads the room's pictures (public/soviet) to the DigitalOcean Spaces
// bucket and writes src/cdn.json, which maps each file to its bucket key.
// The built demo loads them through polotno.com's /mood-assets rewrite
// (next.config.ts), so they're same-origin and canvas reads still work.
//
// Same rules as scripts/upload-asset.mjs: the bucket is APPEND-ONLY. Keys are
// content hashes, HEAD first and PUT only new keys; nothing is ever deleted
// or overwritten.
//   node --env-file=<repo>/.env.local upload-assets.mjs <example dir>
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '/Users/mikhailzhuro/Documents/GitHub/polotno-website/node_modules/@aws-sdk/client-s3/dist-cjs/index.js';

const [, , P] = process.argv;
const PREFIX = 'mood';
const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const env = (k) => process.env[k] || (console.error(`Missing ${k}`), process.exit(1));
const client = new S3Client({
  endpoint: env('DO_SPACES_ENDPOINT'),
  region: env('DO_SPACES_REGION'),
  credentials: { accessKeyId: env('DO_SPACES_KEY'), secretAccessKey: env('DO_SPACES_SECRET') },
  forcePathStyle: false,
});
const bucket = env('DO_SPACES_BUCKET');

// -area.png files only feed relight.mjs; the editor never loads them.
const files = (await readdir(`${P}/public/soviet`)).filter((f) => TYPES[extname(f)] && !f.endsWith('-area.png'));
const map = {};
let fresh = 0;
const queue = [...files];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const f = queue.shift();
    const buf = await readFile(`${P}/public/soviet/${f}`);
    const key = `${PREFIX}/${createHash('sha256').update(buf).digest('hex').slice(0, 16)}${extname(f)}`;
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    } catch (err) {
      if (err?.$metadata?.httpStatusCode !== 404 && err?.name !== 'NotFound') throw err;
      await client.send(new PutObjectCommand({
        Bucket: bucket, Key: key, Body: buf, ContentType: TYPES[extname(f)], ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      fresh++;
    }
    map[`soviet/${f}`] = key.slice(PREFIX.length + 1);
  }
}));
const sorted = Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
await writeFile(`${P}/src/cdn.json`, JSON.stringify(sorted, null, 1) + '\n');
console.log(`${files.length} files, ${fresh} uploaded, src/cdn.json written`);
