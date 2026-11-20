// this is a demo key just for that project
// (!) please don't use it in your projects
// to create your own API key please go here: https://polotno.com/login
export const KEY = 'nFA5H9elEytDyPyvKL7T';

export const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// The template's own photo: what a badge shows when its row has no photo.
const SILHOUETTE = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">` +
    `<rect width="400" height="500" fill="#e5e7eb"/>` +
    `<circle cx="200" cy="200" r="85" fill="#9ca3af"/>` +
    `<ellipse cx="200" cy="480" rx="160" ry="150" fill="#9ca3af"/>` +
    `</svg>`
);

const FONT = 'Inter';

// A 4 × 6 in event badge. Text prints `{{name}}`, `{{role}}` and `{{company}}`;
// the photo binds its `src` to `photo`, the two accent shapes bind their `fill`
// to `accent`, and the VIP ribbon binds `visible` to `vip`.
export const template = {
  schemaVersion: 5,
  width: 600,
  height: 900,
  variables: [
    { name: 'name', label: 'Name', required: true, value: 'Alex Rivera' },
    { name: 'role', label: 'Role', default: 'Attendee', value: 'Speaker' },
    { name: 'company', label: 'Company', value: 'Lumen Labs' },
    // No stored value: the canvas shows the template's own photo.
    {
      name: 'photo',
      label: 'Photo',
      description: 'Any shape: it is cropped to the circle, keeping the top of the picture.',
    },
    { name: 'accent', label: 'Accent', value: '#2563eb' },
    { name: 'vip', label: 'VIP', value: true },
  ],
  pages: [
    {
      id: 'badge',
      background: '#ffffff',
      children: [
        {
          id: 'band',
          type: 'figure',
          subType: 'rect',
          x: 0,
          y: 0,
          width: 600,
          height: 300,
          fill: '#2563eb',
          bindings: { fill: 'accent' },
        },
        {
          id: 'lanyard-slot',
          type: 'figure',
          subType: 'rect',
          x: 255,
          y: 26,
          width: 90,
          height: 16,
          cornerRadius: 8,
          fill: '#ffffff',
          opacity: 0.9,
          selectable: false,
        },
        {
          id: 'event',
          type: 'text',
          x: 40,
          y: 74,
          width: 520,
          text: 'PRODUCT DESIGN SUMMIT',
          fontSize: 26,
          fontFamily: FONT,
          fontWeight: 'bold',
          letterSpacing: 0.12,
          align: 'center',
          fill: '#ffffff',
        },
        {
          id: 'event-date',
          type: 'text',
          x: 40,
          y: 112,
          width: 520,
          text: 'Lisbon · 14–15 May 2027',
          fontSize: 20,
          fontFamily: FONT,
          align: 'center',
          fill: '#ffffff',
          opacity: 0.85,
        },
        {
          id: 'photo-ring',
          type: 'figure',
          subType: 'circle',
          x: 155,
          y: 165,
          width: 290,
          height: 290,
          fill: '#ffffff',
        },
        {
          id: 'photo',
          type: 'image',
          x: 165,
          y: 175,
          width: 270,
          height: 270,
          cornerRadius: 135,
          src: SILHOUETTE,
          bindings: { src: 'photo' },
          // Each guest's photo has its own shape: cover fills the circle, and
          // the focus keeps the top third, where a face usually is.
          fit: 'cover',
          focus: { x: 0.5, y: 0.3 },
        },
        {
          id: 'name',
          type: 'text',
          x: 40,
          y: 478,
          width: 520,
          height: 76,
          text: '{{name}}',
          fontSize: 60,
          fontFamily: FONT,
          fontWeight: 'bold',
          align: 'center',
          fill: '#111827',
          // a long name shrinks to fit the box instead of wrapping
          textOverflow: 'fit',
          minFontSize: 30,
        },
        {
          id: 'role-company',
          type: 'text',
          x: 40,
          y: 566,
          width: 520,
          // rich text: each value takes the style of its token
          text: '<p><strong>{{role}}</strong></p><p>{{company}}</p>',
          fontSize: 30,
          fontFamily: FONT,
          lineHeight: 1.35,
          align: 'center',
          fill: '#4b5563',
        },
        {
          id: 'vip-ribbon',
          type: 'group',
          bindings: { visible: 'vip' },
          children: [
            {
              id: 'vip-band',
              type: 'figure',
              subType: 'rect',
              x: 0,
              y: 740,
              width: 600,
              height: 80,
              fill: '#f5b400',
            },
            {
              id: 'vip-label',
              type: 'text',
              x: 0,
              y: 762,
              width: 600,
              text: 'VIP · ALL ACCESS',
              fontSize: 32,
              fontFamily: FONT,
              fontWeight: 'bold',
              letterSpacing: 0.12,
              align: 'center',
              fill: '#1f2937',
            },
          ],
        },
        {
          id: 'footer',
          type: 'figure',
          subType: 'rect',
          x: 0,
          y: 820,
          width: 600,
          height: 80,
          fill: '#2563eb',
          bindings: { fill: 'accent' },
        },
        {
          id: 'footer-tag',
          type: 'text',
          x: 0,
          y: 845,
          width: 600,
          text: '#PDS2027',
          fontSize: 26,
          fontFamily: FONT,
          fontWeight: 'bold',
          letterSpacing: 0.15,
          align: 'center',
          fill: '#ffffff',
        },
      ],
    },
  ],
};
