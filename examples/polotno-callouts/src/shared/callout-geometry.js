/**
 * Geometry of a callout (speech balloon) shape.
 *
 * The file is pure math: it has no dependency on Polotno, React or the DOM.
 * Both demos use the same file - a copy in each project, so that each project
 * runs alone. One demo turns the paths into an SVG string, the other feeds the
 * same paths into a react-konva <Path/>.
 *
 * Coordinate system: the callout is drawn inside a box `width` x `height`
 * with the origin in the top-left corner.
 *
 *   +--------------------------+  <- the element box
 *   |    +----------------+    |
 *   |    |     body       |    |  <- `inset` keeps a margin for the tail
 *   |    +----------------+    |
 *   |  *                       |  <- `tipX` / `tipY`: the point of the tail
 *   +--------------------------+
 *
 * The tail tip moves inside the box, so the box never changes when the user
 * points the tail somewhere else. The text stays in the same place too.
 */

export const CALLOUT_DEFAULTS = {
  // 'ellipse' (the balloon from the question) or 'rect'
  shape: 'ellipse',
  // 'triangle' = a filled tail, 'line' = a thin leader line with an arrow
  tail: 'triangle',
  // position of the tail tip, as a fraction of the box
  tipX: 0.07,
  tipY: 0.93,
  // width of the tail base, as a fraction of the smaller side of the body
  tailWidth: 0.3,
  // margin between the body and the box, as a fraction of the smaller side
  inset: 0.13,
  // 'rect' only: corner radius as a fraction of the smaller side of the body
  cornerRadius: 0.18,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (n) => Math.round(n * 100) / 100;
const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const towards = (from, to, length) => {
  const d = distance(from, to) || 1;
  return [
    from[0] + ((to[0] - from[0]) / d) * length,
    from[1] + ((to[1] - from[1]) / d) * length,
  ];
};

/** The rectangle that holds the text, in box coordinates. */
export function getBody({ width, height, inset }) {
  const margin = clamp(inset, 0, 0.45) * Math.min(width, height);
  return {
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
  };
}

const ellipsePoint = (body, angle) => [
  body.x + body.width / 2 + (body.width / 2) * Math.cos(angle),
  body.y + body.height / 2 + (body.height / 2) * Math.sin(angle),
];

/** Where a ray from the center of `body` crosses the border of the rectangle. */
function rectPoint(body, angle) {
  const cx = body.x + body.width / 2;
  const cy = body.y + body.height / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tx = dx ? body.width / 2 / Math.abs(dx) : Infinity;
  const ty = dy ? body.height / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return [cx + dx * t, cy + dy * t];
}

const rectSides = (body) => [body.width, body.height, body.width, body.height];

/**
 * A position on the border of the body: 0 = top-left corner, 1 = top-right,
 * 2 = bottom-right, 3 = bottom-left. It increases clockwise, and it wraps.
 */
const wrap4 = (param) => ((param % 4) + 4) % 4;

/** Position on the border, in pixels from the top-left corner, clockwise. */
function rectParamToLength(body, param) {
  const sides = rectSides(body);
  const side = Math.floor(param);
  let length = (param - side) * sides[side];
  for (let i = 0; i < side; i += 1) length += sides[i];
  return length;
}

function rectLengthToParam(body, length) {
  const sides = rectSides(body);
  const perimeter = sides[0] + sides[1] + sides[2] + sides[3];
  let rest = ((length % perimeter) + perimeter) % perimeter;
  for (let side = 0; side < 4; side += 1) {
    if (rest <= sides[side]) return side + rest / sides[side];
    rest -= sides[side];
  }
  return 0;
}

const rectParamToPoint = (body, param) => {
  const wrapped = wrap4(param);
  const side = Math.floor(wrapped);
  const f = wrapped - side;
  if (side === 0) return [body.x + f * body.width, body.y];
  if (side === 1) return [body.x + body.width, body.y + f * body.height];
  if (side === 2)
    return [body.x + body.width - f * body.width, body.y + body.height];
  return [body.x, body.y + body.height - f * body.height];
};

/**
 * The position on the border of `body` that is the closest to `point`. The
 * tail grows from here: near a corner the base wraps the corner, so the tail
 * always keeps its width.
 */
function rectNearestParam(body, point) {
  const x = clamp(point[0], body.x, body.x + body.width);
  const y = clamp(point[1], body.y, body.y + body.height);
  if (y === body.y) return (x - body.x) / body.width;
  if (x === body.x + body.width) return 1 + (y - body.y) / body.height;
  if (y === body.y + body.height)
    return 2 + (body.x + body.width - x) / body.width;
  return 3 + (body.y + body.height - y) / body.height;
}

const rectCorner = (body, index) =>
  [
    [body.x, body.y],
    [body.x + body.width, body.y],
    [body.x + body.width, body.y + body.height],
    [body.x, body.y + body.height],
  ][Math.floor(wrap4(index))];

/** An SVG path through `points`, with a corner radius from `radii`. */
function closedPath(points, radii) {
  const count = points.length;
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const point = points[i];
    const previous = points[(i - 1 + count) % count];
    const next = points[(i + 1) % count];
    const radius = Math.min(
      radii[i] || 0,
      distance(previous, point) / 2,
      distance(point, next) / 2,
    );
    const command = i === 0 ? 'M' : 'L';
    if (radius < 0.5) {
      d += `${command} ${round(point[0])} ${round(point[1])} `;
      continue;
    }
    const start = towards(point, previous, radius);
    const end = towards(point, next, radius);
    d += `${command} ${round(start[0])} ${round(start[1])} `;
    d += `Q ${round(point[0])} ${round(point[1])} ${round(end[0])} ${round(end[1])} `;
  }
  return `${d}Z`;
}

/**
 * Builds the paths of one callout.
 *
 * Returns:
 *   body    - the rectangle for the text, in box coordinates
 *   tip     - the point of the tail
 *   outline - one closed path: the body with the tail welded into it, so the
 *             stroke has no seam
 *   leader  - the leader line of a 'line' tail (null for a 'triangle' tail)
 *   arrow   - the filled arrow head of a 'line' tail (null without one)
 *
 * `pad` (how much space the stroke needs inside the box) and `arrowSize` come
 * from the border width of the caller, so they are drawing options, not
 * settings of the callout: they are not in `CALLOUT_DEFAULTS`.
 */
export function buildCallout(options) {
  const {
    width,
    height,
    shape,
    tail,
    tipX,
    tipY,
    inset,
    tailWidth,
    cornerRadius,
    pad = 1,
    arrowSize = 0,
  } = { ...CALLOUT_DEFAULTS, ...options };
  const body = getBody({ width, height, inset });
  const tip = [
    clamp(tipX * width, pad, width - pad),
    clamp(tipY * height, pad, height - pad),
  ];

  const cx = body.x + body.width / 2;
  const cy = body.y + body.height / 2;
  const rx = body.width / 2;
  const ry = body.height / 2;
  // the angle to the tip, measured in the space where the body is a circle
  const angle = Math.atan2((tip[1] - cy) / ry, (tip[0] - cx) / rx);
  const radius =
    clamp(cornerRadius, 0, 0.5) * Math.min(body.width, body.height);
  // the tail keeps the same base width on every side of the body
  const halfBase =
    (clamp(tailWidth, 0.05, 1) * Math.min(body.width, body.height)) / 2;

  const outside =
    shape === 'ellipse'
      ? ((tip[0] - cx) / rx) ** 2 + ((tip[1] - cy) / ry) ** 2 > 1.05
      : tip[0] < body.x ||
        tip[0] > body.x + body.width ||
        tip[1] < body.y ||
        tip[1] > body.y + body.height;

  const withTail = tail === 'triangle' && outside;

  let outline;
  if (shape === 'ellipse') {
    if (withTail) {
      // how fast the point moves along the ellipse at `angle`: it turns the
      // base width in pixels into an angle
      const speed = Math.hypot(rx * Math.sin(angle), ry * Math.cos(angle)) || 1;
      const spread = clamp(halfBase / speed, 0.05, 1.2);
      const left = ellipsePoint(body, angle - spread);
      const right = ellipsePoint(body, angle + spread);
      // the long way around the ellipse, so the arc never crosses the tail
      outline =
        `M ${round(right[0])} ${round(right[1])} ` +
        `A ${round(rx)} ${round(ry)} 0 1 1 ${round(left[0])} ${round(left[1])} ` +
        `L ${round(tip[0])} ${round(tip[1])} Z`;
    } else {
      outline =
        `M ${round(cx + rx)} ${round(cy)} ` +
        `A ${round(rx)} ${round(ry)} 0 1 1 ${round(cx - rx)} ${round(cy)} ` +
        `A ${round(rx)} ${round(ry)} 0 1 1 ${round(cx + rx)} ${round(cy)} Z`;
    }
  } else if (withTail) {
    const center = rectParamToLength(body, rectNearestParam(body, tip));
    const left = rectLengthToParam(body, center - halfBase);
    const right = rectLengthToParam(body, center + halfBase);
    // walk clockwise from one side of the base, around the body, to the other
    const end = right < left ? left : left + 4;
    const points = [rectParamToPoint(body, right)];
    const radii = [0];
    for (let k = Math.ceil(right + 1e-6); k < end - 1e-6; k += 1) {
      points.push(rectCorner(body, k));
      radii.push(radius);
    }
    points.push(rectParamToPoint(body, left), tip);
    radii.push(0, 0);
    outline = closedPath(points, radii);
  } else {
    outline = closedPath(
      [0, 1, 2, 3].map((k) => rectCorner(body, k)),
      [radius, radius, radius, radius],
    );
  }

  let leader = null;
  let arrow = null;
  if (tail === 'line' && outside) {
    const start =
      shape === 'ellipse' ? ellipsePoint(body, angle) : rectPoint(body, angle);
    leader = `M ${round(start[0])} ${round(start[1])} L ${round(tip[0])} ${round(tip[1])}`;
    if (arrowSize > 0) {
      const size = arrowSize;
      const length = distance(start, tip) || 1;
      const base = towards(tip, start, size);
      // the normal of the leader line, to put the two corners of the arrow
      const nx = (tip[1] - start[1]) / length;
      const ny = -(tip[0] - start[0]) / length;
      const a = [base[0] + (nx * size) / 2.6, base[1] + (ny * size) / 2.6];
      const b = [base[0] - (nx * size) / 2.6, base[1] - (ny * size) / 2.6];
      arrow =
        `M ${round(tip[0])} ${round(tip[1])} L ${round(a[0])} ${round(a[1])} ` +
        `L ${round(b[0])} ${round(b[1])} Z`;
    }
  }

  return { body, tip, outline, leader, arrow };
}
