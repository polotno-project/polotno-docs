import { PAGE_WIDTH, PAGE_HEIGHT, PRODUCT, mmToPx, ptToPx } from './spec.js';

// A postcard that looks finished and is not printable.
//
// Every flaw is one a real job arrives with, and each is invisible on screen —
// which is the whole argument for pre-press. Nothing here is exaggerated to
// make the panel light up: the type is set, the grid holds, and a client would
// sign it off.

// The palette. Two inks and an accent, which is how a card like this is
// actually specified.
const INK = '#000000'; // the panel — flat 100% K, see the report
const CREAM = '#EDE3D4';
const MUTED = '#A08D74';
const ACCENT = '#FF6A00'; // hotter than four inks can hit

// The brand's typefaces. `setGoogleFonts` in index.jsx is what makes these
// loadable — and what makes a font outside that list a real finding rather
// than a guess.
const DISPLAY = 'Playfair Display';
const TEXT = 'Barlow';
const BRAND = 'Helvetica Neue LT Pro'; // licensed desktop font, never packaged

// The photo, at two sizes. The layout was built with the web-resolution copy
// someone pulled from a shared folder; the print master exists, nobody fetched
// it.
const PHOTO_BASE =
  'https://images.unsplash.com/photo-1579992357154-faf4bde95b3d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTY5OTZ8MHwxfHNlYXJjaHwzfHxjb2ZmZWUlMjByb2FzdGVyeSUyMGVzcHJlc3NvfGVufDB8fHx8MTc4NzIyNDgyNHww&ixlib=rb-4.1.0&q=80';

// The layout grid. A single left margin the whole card hangs off — which is
// what makes the one element that breaks it visible in the report, and where
// the safe-area fix puts it back.
const MARGIN = Math.round(mmToPx(PRODUCT.marginMm));
const PANEL_W = 1030;

// One centred column that every line shares. Polotno centres text inside its
// own box, so boxes of different widths centre on different axes and the
// column drifts — giving them all one x and one width is what makes the type
// actually line up, and what lets the safe-area fix put the headline back
// exactly where it belongs.
const COL_X = MARGIN;
const COL_W = PANEL_W - MARGIN * 2;
const centred = (width) => COL_X + (COL_W - width) / 2;

export const ARTWORK = {
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
  // Both the panel and the photo run off the edge, and there is nothing past
  // the trim line for the guillotine to take.
  bleed: 0,
  background: INK,
  children: [
    {
      // Full-height photo column, cropped to a portrait slice.
      type: 'image',
      name: 'Roastery photo',
      x: PANEL_W,
      y: 0,
      width: PAGE_WIDTH - PANEL_W,
      height: PAGE_HEIGHT,
      src: `${PHOTO_BASE}&w=500`,
      cropX: 0.3,
      cropY: 0,
      cropWidth: 0.4,
      cropHeight: 1,
      // Your own asset record travels with the element. A real integration
      // would keep a DAM id here and resolve the master from it.
      custom: { printMasterSrc: `${PHOTO_BASE}&w=2400` },
    },
    {
      // The type panel. Flat black over half a card — see the report.
      type: 'figure',
      subType: 'rect',
      name: 'Type panel',
      x: 0,
      y: 0,
      width: PANEL_W,
      height: PAGE_HEIGHT,
      fill: INK,
    },
    {
      // Reads as a deliberate crop; it is only safe once the page has bleed.
      type: 'figure',
      subType: 'circle',
      name: 'Ring',
      x: 1470,
      y: -120,
      width: 340,
      height: 340,
      fill: 'rgba(0,0,0,0)',
      stroke: CREAM,
      strokeWidth: 5,
      opacity: 0.55,
    },
    {
      // The wordmark, in the licensed font from the brand guidelines.
      type: 'text',
      name: 'Wordmark',
      text: 'NORTHWIND COFFEE ROASTERS',
      fontFamily: BRAND,
      fontSize: 27,
      letterSpacing: 0.32,
      align: 'center',
      x: COL_X,
      y: 96,
      width: COL_W,
      fill: MUTED,
    },
    {
      // Rule under the wordmark. Drawn at 1 px, which at 300 DPI is 0.24 pt.
      type: 'line',
      name: 'Rule',
      x: centred(300),
      y: 158,
      width: 300,
      height: 1,
      color: MUTED,
    },
    {
      // Hangs 40 px off the left edge instead of on the margin — 3.4 mm from
      // the cut, inside the safe area.
      type: 'text',
      name: 'Headline',
      text: 'Grand\nOpening',
      fontFamily: DISPLAY,
      fontSize: 168,
      lineHeight: 0.94,
      align: 'center',
      x: 40,
      y: 250,
      width: COL_W,
      fill: CREAM,
    },
    {
      type: 'text',
      name: 'Date line',
      text: 'SATURDAY 12 APRIL  ·  8AM TILL LATE',
      fontFamily: TEXT,
      fontWeight: 'bold',
      fontSize: 32,
      letterSpacing: 0.14,
      align: 'center',
      x: COL_X,
      y: 606,
      width: COL_W,
      fill: ACCENT,
    },
    {
      // Merge field nobody filled in before the run went out.
      type: 'text',
      name: 'Greeting',
      text: 'Hi {{first_name}}, your table is waiting.',
      fontFamily: DISPLAY,
      fontStyle: 'italic',
      fontSize: 46,
      align: 'center',
      x: COL_X,
      y: 676,
      width: COL_W,
      fill: CREAM,
    },
    {
      type: 'text',
      name: 'Body copy',
      text:
        'Small-batch roasting on a 1950s Probat, ground to order, poured from eight sharp. Stay for the cupping table at eleven.',
      fontFamily: TEXT,
      fontSize: 31,
      lineHeight: 1.45,
      align: 'center',
      // A narrower measure than the column, but still centred on it — body
      // copy reads badly at full width.
      x: centred(760),
      y: 762,
      width: 760,
      fill: MUTED,
    },
    {
      type: 'figure',
      subType: 'rect',
      name: 'CTA button',
      x: centred(520),
      y: 930,
      width: 520,
      height: 108,
      cornerRadius: 4,
      fill: ACCENT,
    },
    {
      // White on that orange: fine on a backlit screen, mud on uncoated stock.
      type: 'text',
      name: 'CTA label',
      text: 'RESERVE YOUR TABLE',
      fontFamily: TEXT,
      fontWeight: 'bold',
      fontSize: 32,
      letterSpacing: 0.1,
      align: 'center',
      x: centred(520),
      y: 966,
      width: 520,
      fill: '#FFFFFF',
    },
    {
      // 3.4 pt legal line. Crisp on a retina display, closed up on paper.
      type: 'text',
      name: 'Legal line',
      text:
        'One free filter per card. Valid 12–14 April at the Quayside store only. Not exchangeable for cash.',
      fontFamily: TEXT,
      fontSize: Math.round(ptToPx(3.4)),
      align: 'center',
      x: COL_X,
      y: 1128,
      width: COL_W,
      fill: MUTED,
    },
    {
      // Left over from an earlier round, hidden rather than deleted.
      type: 'text',
      name: 'Old price badge',
      text: '50% OFF',
      fontFamily: TEXT,
      fontWeight: 'bold',
      fontSize: 64,
      align: 'center',
      x: centred(400),
      y: 420,
      width: 400,
      fill: ACCENT,
      visible: false,
    },
  ],
};

// Declared to the SDK so they can be loaded — and so a font outside this list
// is a genuine finding. `BRAND` is deliberately absent: it is a licensed
// desktop font that never made it into the asset pack, which is exactly how
// this goes wrong in production.
export const BRAND_FONTS = [DISPLAY, TEXT];
