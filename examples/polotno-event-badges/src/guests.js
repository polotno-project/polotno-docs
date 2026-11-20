import { svgUrl } from './template.js';

// A stand-in for a guest's photo: initials on a coloured background. It is
// portrait-shaped like a phone photo, so the badge's `fit: 'cover'` crops it.
function avatar(name, color) {
  const initials = (name.match(/\p{L}+/gu) ?? [])
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">` +
      `<rect width="400" height="500" fill="${color}"/>` +
      `<ellipse cx="200" cy="540" rx="200" ry="150" fill="#ffffff" fill-opacity="0.18"/>` +
      `<text x="200" y="250" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700" fill="#ffffff">${initials}</text>` +
      `</svg>`
  );
}

// The guest list: one record per badge, keyed by variable name. The names and
// companies are made up. Two rows show the fallbacks: Jonas has no role, so
// his badge prints the role's default; the last row has no name, so its badge
// keeps the `{{name}}` token and reports the missing required value, and with
// no photo it keeps the template's own picture.
export const GUESTS = [
  {
    name: 'Alex Rivera',
    role: 'Speaker',
    company: 'Lumen Labs',
    photo: avatar('Alex Rivera', '#0f766e'),
    accent: '#2563eb',
    vip: true,
  },
  {
    name: 'Priya Natarajan',
    role: 'Product Designer',
    company: 'Paper & Pixel',
    photo: avatar('Priya Natarajan', '#9333ea'),
    accent: '#db2777',
    vip: false,
  },
  {
    name: 'Jonas Berg',
    role: '',
    company: 'Fieldwork',
    photo: avatar('Jonas Berg', '#b45309'),
    accent: '#059669',
    vip: false,
  },
  {
    name: 'Amara Okafor',
    role: 'Organizer',
    company: 'Acme Print',
    photo: avatar('Amara Okafor', '#be123c'),
    accent: '#7c3aed',
    vip: true,
  },
  {
    name: 'Lucía Torres',
    role: 'Sponsor',
    company: 'Tidewater Media',
    photo: avatar('Lucía Torres', '#1d4ed8'),
    accent: '#ea580c',
    vip: false,
  },
  {
    name: '',
    role: 'Volunteer',
    company: 'Orbit Studio',
    photo: '',
    accent: '#0891b2',
    vip: false,
  },
];
