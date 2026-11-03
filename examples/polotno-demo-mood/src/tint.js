// Recolour a piece without AI: keep each pixel's brightness relative to the
// fabric's typical brightness and multiply it into the target colour, in
// linear light. Folds, creases and sheen carry over; legs and pillows outside
// the mask keep their own colour. The colour is what the fabric looks like in
// the original render's daylight: in a relit picture (`baseSrc` is the
// original) it takes that light's brightness, so a mustard sofa is dim on a
// cloudy day instead of glowing, and the light's colour (`cast`, measured
// over the whole room: measured on the fabric it's mostly noise).

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });

const toLinear = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l) => {
  const c = Math.min(1, Math.max(0, l));
  return (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255;
};

const cache = new Map();
const HIGHLIGHTS = 0.4;

/** Returns a data URL of `src` with the `maskSrc` area recoloured to `rgb`. */
export async function tint(src, maskSrc, rgb, baseSrc = src, cast = [1, 1, 1]) {
  const key = `${src}|${rgb}`;
  if (!cache.has(key)) cache.set(key, render(src, maskSrc, rgb, baseSrc, cast));
  return cache.get(key);
}

async function render(src, maskSrc, rgb, baseSrc, cast) {
  const [img, maskImg, baseImg] = await Promise.all([loadImage(src), loadImage(maskSrc), loadImage(baseSrc)]);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(maskImg, 0, 0, w, h);
  const m = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(baseImg, 0, 0, w, h);
  const b = ctx.getImageData(0, 0, w, h).data;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h);

  // The light's brightness over the fabric. Only brightness: measured on a
  // strongly coloured fabric (the red original) a per-channel cast is mostly
  // noise in its weak channels, and turns mustard olive; the colour comes
  // from `cast`.
  let now = 0, before = 0;
  for (let i = 0; i < d.data.length; i += 4) {
    if (m[i] <= 128) continue;
    now += 0.2126 * toLinear(d.data[i]) + 0.7152 * toLinear(d.data[i + 1]) + 0.0722 * toLinear(d.data[i + 2]);
    before += 0.2126 * toLinear(b[i]) + 0.7152 * toLinear(b[i + 1]) + 0.0722 * toLinear(b[i + 2]);
  }
  const gain = before ? now / before : 1;

  const lum = new Float32Array(w * h);
  const fabric = [];
  for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
    lum[p] =
      0.2126 * toLinear(d.data[i]) + 0.7152 * toLinear(d.data[i + 1]) + 0.0722 * toLinear(d.data[i + 2]);
    if (m[i] > 128) fabric.push(lum[p]);
  }
  fabric.sort((a, b) => a - b);
  const ref = fabric[Math.floor(fabric.length * 0.6)] || 1;

  const t = rgb.map((v) => toLinear(v) * gain);
  // Dark colours get stronger shading: a pale source has too little contrast
  // to carry them, and real dark fabric shows more falloff.
  const bright = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const gamma = 1 + 0.9 * (1 - bright);
  for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
    const k = m[i] / 255;
    if (!k) continue;
    let shade = (lum[p] / ref) ** gamma;
    // Brighter than the fabric's typical tone, shading is compressed and
    // keeps the colour. A lamp at night lights one arm several times brighter
    // than the rest; taken as is, or rolled toward white, a pale colour there
    // glows like glass in the sun. A cap instead flattens the texture.
    if (shade > 1) shade **= HIGHLIGHTS;
    for (let ch = 0; ch < 3; ch++) d.data[i + ch] = d.data[i + ch] * (1 - k) + Math.min(255, toSrgb(t[ch] * shade) * cast[ch]) * k;
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
