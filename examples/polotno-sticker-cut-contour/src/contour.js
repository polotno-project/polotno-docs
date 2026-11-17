// Turn the artwork's transparency into closed cut paths, one per piece:
// alpha mask → grow by the offset → split into pieces → trace each outline
// → drop the staircase points → round the corners.
// Everything runs on a small grid (about 600 cells across), so it is quick
// enough to rerun on every edit.

const SOLID = 16; // alpha above this counts as artwork

function maskFromImageData({ data, width, height }) {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > SOLID ? 1 : 0;
  return mask;
}

// Chamfer distance (3 for a straight step, 4 for a diagonal), then keep every
// cell within `radius` cells of the artwork.
function grow(mask, w, h, radius) {
  const INF = 1e9;
  const d = new Float64Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? INF : d[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }
  const out = new Uint8Array(w * h);
  const limit = radius * 3;
  for (let i = 0; i < d.length; i++) out[i] = d[i] <= limit ? 1 : 0;
  return out;
}

// Each separate piece gets its own cut line. Specks far smaller than the main
// piece are dropped.
function pieces(mask, w, h) {
  const label = new Int32Array(w * h);
  const sizes = [0];
  const stack = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue;
    const id = sizes.length;
    let size = 0;
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % w;
      const y = (i - x) / w;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (mask[j] && !label[j]) {
          label[j] = id;
          stack.push(j);
        }
      }
    }
    sizes.push(size);
  }
  const min = Math.max(...sizes) * 0.02;
  const out = [];
  sizes.forEach((size, id) => {
    if (!id || size < min) return;
    const m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) if (label[i] === id) m[i] = 1;
    out.push(m);
  });
  return out;
}

// Moore-neighbour tracing of the outer boundary. Returns cell centres.
function traceOutline(mask, w, h) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  let start = -1;
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) {
      start = i;
      break;
    }
  if (start < 0) return [];
  const sx = start % w;
  const sy = (start - sx) / w;
  // Clockwise neighbours, starting west.
  const dirs = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const points = [[sx + 0.5, sy + 0.5]];
  let x = sx;
  let y = sy;
  let from = 0; // we entered the start cell from the west (scan order)
  const maxSteps = w * h * 4;
  for (let step = 0; step < maxSteps; step++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const dir = (from + 1 + k) % 8;
      const nx = x + dirs[dir][0];
      const ny = y + dirs[dir][1];
      if (inside(nx, ny)) {
        x = nx;
        y = ny;
        from = (dir + 4) % 8; // the direction pointing back where we came from
        found = true;
        break;
      }
    }
    if (!found || (x === sx && y === sy)) break;
    points.push([x + 0.5, y + 0.5]);
  }
  return points;
}

// Ramer–Douglas–Peucker on a closed outline.
function simplify(points, epsilon) {
  if (points.length < 4) return points;
  const rdp = (pts) => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0];
    const [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let index = 0;
    let max = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i];
      const dist = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (dist > max) {
        max = dist;
        index = i;
      }
    }
    if (max <= epsilon) return [pts[0], pts[pts.length - 1]];
    return [...rdp(pts.slice(0, index + 1)).slice(0, -1), ...rdp(pts.slice(index))];
  };
  const half = Math.floor(points.length / 2);
  const a = rdp(points.slice(0, half + 1));
  const b = rdp([...points.slice(half), points[0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

// Chaikin corner cutting: a die follows a smooth line better than a polygon.
function smooth(points, rounds = 2) {
  let pts = points;
  for (let r = 0; r < rounds; r++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      out.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    pts = out;
  }
  return pts;
}

/**
 * Cut outline around everything drawn on `imageData`, `offsetCells` away from
 * the artwork, as SVG path data in grid units. Empty string when nothing is drawn.
 */
export function cutPath(imageData, offsetCells) {
  const { width: w, height: h } = imageData;
  const art = maskFromImageData(imageData);
  return pieces(grow(art, w, h, offsetCells), w, h)
    .map((piece) => smooth(simplify(traceOutline(piece, w, h), 0.8)))
    .filter((outline) => outline.length >= 3)
    .map((outline) => 'M' + outline.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L') + ' Z')
    .join(' ');
}
