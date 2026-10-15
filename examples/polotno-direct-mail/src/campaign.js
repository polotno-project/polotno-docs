// The campaign: who is mailing, what they say to each segment, and the rules
// that turn one donor record into the values printed on their piece.
//
// Larkspur Valley Food Bank is invented for this demo. So is every donor.

export const ORG = {
  name: 'Larkspur Valley',
  descriptor: 'FOOD BANK',
  returnAddress: '1450 Mill Race Road\nLarkspur Valley, OR 97000',
  phone: '(541) 555-0142',
  signer: 'Rosa Delgado',
  signerTitle: 'Executive Director',
  matchSponsor: 'the Hartwell Family Foundation',
  permit: 'NONPROFIT ORG\nU.S. POSTAGE\nPAID\nLARKSPUR VALLEY OR\nPERMIT NO. 000',
  // Where the reply-slip QR code points. It comes back to this demo, so a
  // scan in the room lands somewhere real.
  giveUrl: 'https://polotno.com/demo/direct-mail-donor-postcards',
};

export const COLORS = {
  green: '#1F4D3A',
  greenDeep: '#163A2B',
  orange: '#D9692B',
  cream: '#F6F0E4',
  ink: '#1C1C1A',
  muted: '#5E5A52',
};

export const FONTS = {
  display: 'Fraunces',
  body: 'Source Serif 4',
  sans: 'Libre Franklin',
  script: 'Caveat',
};

// One photo per segment. Sizes are the originals', so a crop can be computed
// without loading the image first.
export const PHOTOS = {
  volunteers: {
    label: 'Volunteers sorting',
    src: 'https://images.unsplash.com/photo-1599059813005-11265ba4b4ce?w=2400&q=80',
    thumb: 'https://images.unsplash.com/photo-1599059813005-11265ba4b4ce?w=240&q=60',
    width: 5472,
    height: 3648,
  },
  family: {
    label: 'Family dinner',
    src: 'https://images.unsplash.com/photo-1576089073624-b5751a8f4de9?w=2400&q=80',
    thumb: 'https://images.unsplash.com/photo-1576089073624-b5751a8f4de9?w=240&q=60',
    width: 3000,
    height: 2400,
  },
  produce: {
    label: 'Produce crate',
    src: 'https://images.unsplash.com/photo-1635341083777-5f93a755e916?w=2400&q=80',
    thumb: 'https://images.unsplash.com/photo-1635341083777-5f93a755e916?w=240&q=60',
    width: 3024,
    height: 4032,
  },
};

export const SEGMENT_IDS = ['active', 'lapsed', 'new'];

// What each donor group hears. Editable in the Versions panel; the copy can
// use any field, so {{name}} and {{last_gift}} resolve per donor.
export const DEFAULT_CAMPAIGN = {
  matchDeadline: 'December 31',
  segments: {
    active: {
      label: 'Active donors',
      who: 'Gave in the last 18 months',
      headline: '{{name}}, you helped fill 41,000 plates this year.',
      opening:
        'Your gift of {{last_gift}} helped put food on tables across Larkspur Valley this year. As winter comes, the line at our pantry door is growing again.',
      photo: 'volunteers',
      askRule: 'Last gift, then about 1.5× and 2×',
    },
    lapsed: {
      label: 'Lapsed donors',
      who: 'Last gift more than 18 months ago',
      headline: "We've missed you, {{name}}.",
      opening:
        'It has been a while since your gift of {{last_gift}}, and a lot has changed. More families are coming to our pantry this winter than in any of the last five years.',
      photo: 'family',
      askRule: 'Last gift, then about 1.25× and 1.5×',
    },
    new: {
      label: 'New donors',
      who: 'No gift on file yet',
      headline: 'Welcome to the table, {{name}}.',
      opening:
        'Thank you for joining us. A first gift goes to work right away: every dollar you give provides three meals for a neighbor who needs one.',
      photo: 'produce',
      askRule: '$25, $50 and $100',
    },
  },
};

// --- fields --------------------------------------------------------------

// Columns a donor list is expected to have. Any other column in an uploaded
// CSV becomes a field too.
export const LIST_FIELDS = [
  { key: 'donor_id', label: 'Donor ID' },
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'address_1', label: 'Street' },
  { key: 'address_2', label: 'Apt' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP' },
  { key: 'last_gift', label: 'Last gift' },
  { key: 'segment', label: 'Group' },
];

// Values filled in per donor from the list. How each is worked out is code
// the platform owns; `note` says it in a line.
export const DERIVED_FIELDS = [
  { key: 'greeting', label: 'Greeting', note: '"Dear Margaret," or "Dear Friend," with no name' },
  { key: 'name', label: 'Name', note: 'First name, or "Friend"' },
  { key: 'full_name', label: 'Full name', note: 'First and last name together' },
  { key: 'city_state_zip', label: 'City, state ZIP', note: 'The last address line' },
  { key: 'ask_1', label: 'Gift 1', note: 'Gift amounts come from the last gift' },
  { key: 'ask_2', label: 'Gift 2', note: 'Gift amounts come from the last gift' },
  { key: 'ask_3', label: 'Gift 3', note: 'Gift amounts come from the last gift' },
  { key: 'meals_1', label: 'Meals for gift 1', note: '3 meals per dollar' },
  { key: 'headline', label: 'Headline', note: 'Set per donor group in Versions' },
  { key: 'opening', label: 'Opening', note: 'Set per donor group in Versions' },
  { key: 'match_deadline', label: 'Match deadline', note: 'Set in Versions' },
];

/** A readable name for an uploaded column with no field of its own. */
export const columnLabel = (key) => key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// --- rules ---------------------------------------------------------------

// Gift amounts a fundraiser would actually print. Asks snap up to the next
// rung, so a $60 donor is asked for $75, not $60.
const LADDER = [10, 15, 20, 25, 35, 50, 75, 100, 125, 150, 200, 250, 300, 350, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000];

const snapUp = (n) => LADDER.find((v) => v >= n) ?? Math.ceil(n / 1000) * 1000;
const snapNear = (n) => LADDER.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best), LADDER[0]);
const nextRung = (n) => LADDER.find((v) => v > n) ?? n + 1000;

export const money = (n) => (n ? `$${Number(n).toLocaleString('en-US')}` : '');

export const parseGift = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function normalizeSegment(raw, lastGift) {
  const s = String(raw || '').trim().toLowerCase();
  if (SEGMENT_IDS.includes(s)) return s;
  return lastGift ? 'active' : 'new';
}

export function askString(lastGift, segment) {
  if (!lastGift || segment === 'new') return [25, 50, 100];
  const mult = segment === 'lapsed' ? [1, 1.25, 1.5] : [1, 1.5, 2];
  const asks = [];
  for (const m of mult) {
    // The first ask never goes below the last gift; the upgrades round to the
    // nearest amount on the ladder.
    let v = asks.length ? snapNear(lastGift * m) : snapUp(lastGift);
    // Three distinct, rising amounts, even where rounding lands two on the
    // same rung.
    if (asks.length && v <= asks[asks.length - 1]) v = nextRung(asks[asks.length - 1]);
    asks.push(v);
  }
  return asks;
}

const TITLE = /^(dr|rev|mr|mrs|ms|mx|prof)\.?\s+/i;

const TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const fillTokens = (text, values) =>
  String(text).replace(TOKEN, (m, key) => (key in values ? values[key] : m));

/** Fields still in the text after filling: ones the list had no column for. */
export const findTokens = (text) => [...String(text).matchAll(TOKEN)].map((m) => m[1]);

/**
 * Every value a template can print for one donor: the list's own columns, plus
 * what the rules compute from them. `notes` records which rules changed
 * something, so the proof can say so.
 */
export function deriveFields(donor, campaign) {
  const clean = Object.fromEntries(
    Object.entries(donor).map(([k, v]) => [k, String(v ?? '').trim()])
  );
  const first = clean.first_name;
  const last = clean.last_name;
  const gift = parseGift(clean.last_gift);
  const segment = normalizeSegment(clean.segment, gift);
  const [a1, a2, a3] = askString(gift, segment);
  const notes = [];

  // "Dr. Alexandra" is addressed as Dr. Montgomery-Fitzgerald, never as
  // Dr. Alexandra.
  const titled = first.match(TITLE);
  const given = first.replace(TITLE, '').trim();
  const formal = titled && last ? `${titled[1][0].toUpperCase()}${titled[1].slice(1).toLowerCase()}. ${last}` : '';
  const greetName = formal || given;
  if (formal) notes.push(`Has a title, so the greeting is "Dear ${formal},"`);
  else if (!given) notes.push('No first name, so the greeting is "Dear Friend,"');

  const values = {
    ...clean,
    segment,
    last_gift: money(gift) || 'your first gift',
    greeting: greetName ? `Dear ${greetName},` : 'Dear Friend,',
    name: greetName || 'Friend',
    full_name: [first, last].filter(Boolean).join(' '),
    city_state_zip: [clean.city, [clean.state, clean.zip].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', '),
    ask_1: money(a1),
    ask_2: money(a2),
    ask_3: money(a3),
    meals_1: (a1 * 3).toLocaleString('en-US'),
    match_deadline: campaign.matchDeadline,
  };
  const seg = campaign.segments[segment];
  values.headline = fillTokens(seg.headline, values);
  values.opening = fillTokens(seg.opening, values);
  return { values, segment, asks: [a1, a2, a3], photo: PHOTOS[seg.photo], notes };
}

/** A list row is mailable when it has somewhere to be delivered. */
export function addressProblem(donor) {
  const missing = ['address_1', 'city', 'state', 'zip'].filter((k) => !String(donor[k] ?? '').trim());
  if (!missing.length) return null;
  const names = { address_1: 'street', city: 'city', state: 'state', zip: 'ZIP' };
  return `Missing ${missing.map((k) => names[k]).join(', ')}`;
}
