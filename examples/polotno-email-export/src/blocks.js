// Content items and ready-made blocks. Each builder takes the page width (600
// on desktop, 350 on mobile) and the theme ({ heading, body, card }), and returns elements placed
// relative to the block's top plus the block's height.
import { id, PAD } from './layout.js';

export const COLORS = {
  page: '#f3f1ed',
  card: '#ffffff',
  ink: '#161616',
  muted: '#5c5c5c',
  accent: '#d63d1c',
  dark: '#161616',
};

const PHOTOS = {
  desk: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1200&q=80',
  studio: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80',
  paper: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80',
};

// Text height before the canvas measures it: close enough to lay out a block.
export function textHeight(text, fontSize, width, lineHeight = 1.4) {
  const plain = String(text).replace(/<[^>]+>/g, '');
  const perLine = Math.max(1, Math.floor(width / (fontSize * 0.52)));
  const lines = plain.split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
  return Math.ceil(lines * fontSize * lineHeight);
}

// `fontFamily` may be the { heading, body } pair: bold text from 18 px up is a
// heading, the rest is body text.
const text = (attrs) => {
  const { text: t, fontSize = 16, width, lineHeight = 1.5, fontFamily: fam } = attrs;
  const isHeading = (parseInt(attrs.fontWeight, 10) || 400) >= 600 && fontSize >= 18;
  const fontFamily = typeof fam === 'object' ? (isHeading ? fam.heading : fam.body) : fam;
  return {
    type: 'text',
    id: id('text'),
    fill: COLORS.ink,
    lineHeight,
    fontSize,
    align: 'left',
    ...attrs,
    fontFamily,
    height: attrs.height ?? textHeight(t, fontSize, width, lineHeight),
  };
};
const rect = (attrs) => ({ type: 'figure', subType: 'rect', id: id('rect'), strokeWidth: 0, ...attrs });
const image = (attrs) => ({ type: 'image', id: id('img'), ...attrs });
const section = (w, height, fill) => rect({ x: 0, y: 0, width: w, height, fill, name: 'Section' });

// A button is a rounded rect with a label on it, grouped so they move together.
function button(x, y, label, font, { fill = COLORS.accent, color = '#ffffff', width = 220 } = {}) {
  const bg = rect({ x, y, width, height: 48, fill, cornerRadius: 6, name: 'Button' });
  const t = text({
    x,
    y: y + 13,
    width,
    height: 22,
    text: label,
    fontSize: 16,
    lineHeight: 1.4,
    fontFamily: font,
    fontWeight: '600',
    fill: color,
    align: 'center',
  });
  return { elements: [bg, t], group: [bg.id, t.id], height: 48 };
}

// ---------- Content: one item each ----------

export const CONTENT = [
  {
    name: 'heading',
    label: 'Heading',
    build: (w, font) => {
      const t = text({ x: PAD, y: 16, width: w - 2 * PAD, text: 'Your heading', fontSize: w < 600 ? 26 : 32, lineHeight: 1.25, fontFamily: font, fontWeight: '600' });
      return { height: t.height + 32, elements: [t] };
    },
  },
  {
    name: 'paragraph',
    label: 'Paragraph',
    build: (w, font) => {
      const t = text({
        x: PAD,
        y: 12,
        width: w - 2 * PAD,
        text: 'Write something your readers will want to read. This text stays live HTML in the email.',
        fontSize: 16,
        fontFamily: font,
      });
      return { height: t.height + 24, elements: [t] };
    },
  },
  {
    name: 'button',
    label: 'Button',
    build: (w, font) => {
      const b = button(PAD, 16, 'Call to action', font);
      return { height: 80, elements: b.elements, groups: [b.group] };
    },
  },
  {
    name: 'image',
    label: 'Image',
    build: (w) => {
      const h = Math.round((w - 2 * PAD) * 0.56);
      return { height: h + 32, elements: [image({ x: PAD, y: 16, width: w - 2 * PAD, height: h, src: PHOTOS.studio })] };
    },
  },
  {
    name: 'divider',
    label: 'Divider',
    build: (w) => ({ height: 33, elements: [rect({ x: PAD, y: 16, width: w - 2 * PAD, height: 1, fill: '#d8d8d8', name: 'Divider' })] }),
  },
  {
    name: 'spacer',
    label: 'Spacer',
    build: () => ({ height: 40, elements: [] }),
  },
];

// ---------- Blocks: whole sections ----------

function header(w, font) {
  return {
    height: 88,
    elements: [
      section(w, 88, font.card),
      rect({ x: PAD, y: 34, width: 20, height: 20, fill: COLORS.ink, name: 'Logo' }),
      text({ x: PAD + 30, y: 31, width: 160, height: 26, text: 'Polotno', fontSize: 20, lineHeight: 1.3, fontFamily: font, fontWeight: '600' }),
    ],
  };
}

function hero(w, font) {
  const inner = w - 2 * PAD;
  const imgH = Math.round(inner * 0.55);
  const h1 = text({
    x: PAD,
    y: imgH + 32,
    width: inner,
    text: 'Design emails with the editor your users already know',
    fontSize: w < 600 ? 26 : 34,
    lineHeight: 1.2,
    fontFamily: font,
    fontWeight: '600',
  });
  const p = text({
    x: PAD,
    y: h1.y + h1.height + 16,
    width: inner,
    text: 'Every headline and paragraph stays real text, so it reads well with images off and is easy to search.',
    fontSize: 16,
    fill: COLORS.muted,
    fontFamily: font,
  });
  const b = button(PAD, p.y + p.height + 24, 'Start designing', font);
  const height = p.y + p.height + 24 + 48 + 40;
  return {
    height,
    elements: [section(w, height, font.card), image({ x: PAD, y: 0, width: inner, height: imgH, src: PHOTOS.desk, cornerRadius: 8 }), h1, p, ...b.elements],
    groups: [b.group],
  };
}

function article(w, font) {
  const inner = w - 2 * PAD;
  const eyebrow = text({ x: PAD, y: 32, width: inner, height: 20, text: 'NEW FEATURE', fontSize: 14, lineHeight: 1.4, letterSpacing: 0.08, fill: COLORS.accent, fontFamily: font, fontWeight: '600' });
  const h2 = text({ x: PAD, y: 60, width: inner, text: 'Image masking', fontSize: 24, lineHeight: 1.3, fontFamily: font, fontWeight: '600' });
  const p = text({
    x: PAD,
    y: h2.y + h2.height + 12,
    width: inner,
    text: 'Drop a photo into any shape. The mask is part of the image, so the email shows exactly what you designed.',
    fontSize: 16,
    fontFamily: font,
  });
  const height = p.y + p.height + 32;
  return { height, elements: [section(w, height, font.card), eyebrow, h2, p] };
}

function columns(w, font) {
  const stacked = w < 500;
  const gap = 24;
  const colW = stacked ? w - 2 * PAD : (w - 2 * PAD - gap) / 2;
  const imgH = Math.round(colW * 0.66);
  const items = [
    { src: PHOTOS.studio, title: 'Brand kits', body: 'Fonts, colours and logos in one place.' },
    { src: PHOTOS.paper, title: 'Print ready', body: 'CMYK PDF from the same design.' },
  ];
  const elements = [];
  let bottom = 0;
  items.forEach((it, i) => {
    const x = stacked ? PAD : PAD + i * (colW + gap);
    const top = stacked ? 32 + i * (imgH + 120) : 32;
    const t = text({ x, y: top + imgH + 16, width: colW, text: it.title, fontSize: 18, lineHeight: 1.3, fontFamily: font, fontWeight: '600' });
    const b = text({ x, y: t.y + t.height + 6, width: colW, text: it.body, fontSize: 15, fill: COLORS.muted, fontFamily: font });
    elements.push(image({ x, y: top, width: colW, height: imgH, src: it.src, cornerRadius: 6 }), t, b);
    bottom = Math.max(bottom, b.y + b.height);
  });
  const height = bottom + 32;
  return { height, elements: [section(w, height, font.card), ...elements] };
}

function cta(w, font) {
  const inner = w - 2 * PAD;
  const h = text({ x: PAD, y: 40, width: inner, text: 'Ready to try it?', fontSize: w < 600 ? 24 : 28, lineHeight: 1.25, fill: '#ffffff', fontFamily: font, fontWeight: '600', align: 'center' });
  const bw = 220;
  const b = button((w - bw) / 2, h.y + h.height + 20, 'Open Polotno Studio', font, { fill: '#ffffff', color: COLORS.dark, width: bw });
  const height = h.y + h.height + 20 + 48 + 40;
  return { height, elements: [section(w, height, COLORS.dark), h, ...b.elements], groups: [b.group] };
}

function footer(w, font) {
  const inner = w - 2 * PAD;
  const t = text({
    x: PAD,
    y: 28,
    width: inner,
    // Addresses and URLs in live text are linked in the text colour.
    text: 'You receive this email because you signed up at polotno.com.\nUnsubscribe: https://polotno.com/unsubscribe',
    fontSize: 14,
    fill: COLORS.muted,
    fontFamily: font,
    align: 'center',
  });
  const height = t.y + t.height + 28;
  return { height, elements: [t] };
}

export const BLOCKS = [
  { name: 'header', label: 'Header', build: header },
  { name: 'hero', label: 'Hero', build: hero },
  { name: 'article', label: 'Article', build: article },
  { name: 'columns', label: 'Two columns', build: columns },
  { name: 'cta', label: 'Call to action', build: cta },
  { name: 'footer', label: 'Footer', build: footer },
];

export const STARTER = ['header', 'hero', 'article', 'columns', 'cta', 'footer'];
