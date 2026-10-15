// Mail formats and the USPS rules each one is held to.
//
// Everything here is in inches, because that is how the mail standards are
// written. The design itself is stored in pixels at 300 DPI; `inch()` is the
// one conversion between the two.

export const DPI = 300;
export const inch = (n) => Math.round(n * DPI);
export const pt = (n) => (n * DPI) / 72;
export const toInches = (px) => px / DPI;

// Zones are reserved areas on the address side. Only the element that owns a
// zone may sit inside it (the indicia in the postage area, the address block in
// the address area); anything else overlapping one is a conflict. The barcode
// clear zone has no owner: it stays empty so USPS equipment can spray the
// Intelligent Mail barcode there.
//
// Geometry is from the trim corner, in inches.
const postcardZones = (w, h, address) => [
  {
    id: 'postage',
    label: 'Postage / indicia',
    noun: 'the postage area',
    rule: 'Upper-right corner, reserved for the permit indicia.',
    x: w - 1.75,
    y: 0,
    w: 1.75,
    h: 1.25,
  },
  {
    id: 'address',
    label: 'Delivery address',
    noun: 'the delivery address area',
    rule: 'OCR read area. Holds the address block and nothing else.',
    ...address,
  },
  {
    id: 'barcode',
    label: 'Barcode clear zone',
    noun: 'the barcode clear zone',
    rule: 'Bottom 5/8 in, rightmost 4 3/4 in. Must stay blank.',
    x: w - 4.75,
    y: h - 0.625,
    w: 4.75,
    h: 0.625,
  },
];

export const FORMATS = {
  postcard69: {
    id: 'postcard69',
    name: 'Large postcard',
    size: '6 × 9 in',
    widthIn: 9,
    heightIn: 6,
    bleedIn: 0.125,
    pageNames: ['Front', 'Address side'],
    addressPage: 1,
    zones: postcardZones(9, 6, { x: 4.5, y: 3.25, w: 4, h: 2.125 }),
  },
  postcard46: {
    id: 'postcard46',
    name: 'Postcard',
    size: '4 × 6 in',
    widthIn: 6,
    heightIn: 4,
    bleedIn: 0.125,
    pageNames: ['Front', 'Address side'],
    addressPage: 1,
    zones: postcardZones(6, 4, { x: 2.25, y: 1.75, w: 3.25, h: 1.625 }),
  },
  postcard611: {
    id: 'postcard611',
    name: 'Jumbo postcard',
    size: '6 × 11 in',
    widthIn: 11,
    heightIn: 6,
    bleedIn: 0.125,
    pageNames: ['Front', 'Address side'],
    addressPage: 1,
    zones: postcardZones(11, 6, { x: 6.5, y: 3.25, w: 4, h: 2.125 }),
  },
};

export const FORMAT_IDS = ['postcard46', 'postcard69', 'postcard611'];
