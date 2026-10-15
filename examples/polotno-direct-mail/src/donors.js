// The sample list. Invented people at invented street numbers, chosen so the
// awkward cases a real file always has are all here: a name too long for the
// address block, an organization with no first name, a donor with no gift on
// file, a $1,000 donor, accents and apostrophes, an apartment line, and one
// record with no street address that cannot be mailed.

export const SAMPLE_DONORS = [
  { donor_id: 'LV-104821', first_name: 'Margaret', last_name: 'Chen', address_1: '2214 Alder Street', address_2: '', city: 'Eugene', state: 'OR', zip: '97405', last_gift: '50', segment: 'active' },
  { donor_id: 'LV-104822', first_name: 'Dr. Alexandra', last_name: 'Montgomery-Fitzgerald', address_1: '88 Riverbend Terrace', address_2: 'Suite 1200', city: 'Springfield', state: 'OR', zip: '97477', last_gift: '250', segment: 'active' },
  { donor_id: 'LV-104823', first_name: '', last_name: 'The Okafor Family Trust', address_1: '415 Pearl Street', address_2: '', city: 'Eugene', state: 'OR', zip: '97401', last_gift: '500', segment: 'active' },
  { donor_id: 'LV-104824', first_name: 'James', last_name: "O'Brien", address_1: '1290 Willamette Street', address_2: 'Apt 4B', city: 'Eugene', state: 'OR', zip: '97401', last_gift: '35', segment: 'lapsed' },
  { donor_id: 'LV-104825', first_name: 'Priya', last_name: 'Raman', address_1: '77 Cascade View Drive', address_2: '', city: 'Corvallis', state: 'OR', zip: '97330', last_gift: '', segment: 'new' },
  { donor_id: 'LV-104826', first_name: 'Robert', last_name: 'Whitfield', address_1: '3 Hawthorne Lane', address_2: '', city: 'Albany', state: 'OR', zip: '97321', last_gift: '1000', segment: 'active' },
  { donor_id: 'LV-104827', first_name: 'Lucía', last_name: 'Hernández', address_1: '560 Oak Grove Road', address_2: '', city: 'Cottage Grove', state: 'OR', zip: '97424', last_gift: '75', segment: 'active' },
  { donor_id: 'LV-104828', first_name: 'Thomas', last_name: 'Nguyen', address_1: '', address_2: '', city: 'Eugene', state: 'OR', zip: '97402', last_gift: '100', segment: 'active' },
  { donor_id: 'LV-104829', first_name: 'Eleanor', last_name: 'Brooks', address_1: '1802 Lincoln Street', address_2: '', city: 'Eugene', state: 'OR', zip: '97401', last_gift: '500', segment: 'lapsed' },
  { donor_id: 'LV-104830', first_name: 'Samuel', last_name: 'Adeyemi', address_1: '940 River Road', address_2: 'Unit 12', city: 'Eugene', state: 'OR', zip: '97404', last_gift: '20', segment: 'active' },
  { donor_id: 'LV-104831', first_name: 'Grace', last_name: 'Lindqvist', address_1: '27 Fern Hollow Court', address_2: '', city: 'Creswell', state: 'OR', zip: '97426', last_gift: '', segment: 'new' },
  { donor_id: 'LV-104832', first_name: 'Daniel', last_name: 'Kowalski', address_1: '4410 Royal Avenue', address_2: '', city: 'Eugene', state: 'OR', zip: '97402', last_gift: '150', segment: 'lapsed' },
  { donor_id: 'LV-104833', first_name: 'Mei', last_name: 'Tanaka', address_1: '615 Monroe Street', address_2: '', city: 'Corvallis', state: 'OR', zip: '97330', last_gift: '60', segment: 'active' },
  { donor_id: 'LV-104834', first_name: 'Henry', last_name: 'Castellanos', address_1: '1120 Main Street', address_2: '', city: 'Springfield', state: 'OR', zip: '97477', last_gift: '25', segment: 'lapsed' },
  { donor_id: 'LV-104835', first_name: 'Ruth', last_name: 'Abernathy', address_1: '38 Quail Run', address_2: '', city: 'Junction City', state: 'OR', zip: '97448', last_gift: '200', segment: 'active' },
  { donor_id: 'LV-104836', first_name: 'Marcus', last_name: 'Bell', address_1: '2701 Harris Street', address_2: '', city: 'Eugene', state: 'OR', zip: '97405', last_gift: '', segment: 'new' },
  { donor_id: 'LV-104837', first_name: 'Ingrid', last_name: 'Solberg', address_1: '903 Ninth Avenue', address_2: 'Apt 2', city: 'Albany', state: 'OR', zip: '97321', last_gift: '40', segment: 'active' },
  { donor_id: 'LV-104838', first_name: 'Victor', last_name: 'Ramírez', address_1: '15 Cedar Point Road', address_2: '', city: 'Veneta', state: 'OR', zip: '97487', last_gift: '300', segment: 'lapsed' },
  { donor_id: 'LV-104839', first_name: 'Hannah', last_name: 'Goldberg', address_1: '2288 Agate Street', address_2: '', city: 'Eugene', state: 'OR', zip: '97403', last_gift: '125', segment: 'active' },
  { donor_id: 'LV-104840', first_name: 'Oluwaseun', last_name: 'Bankole-Williams', address_1: '471 Country Club Road', address_2: '', city: 'Eugene', state: 'OR', zip: '97401', last_gift: '15', segment: 'active' },
];

// --- CSV -----------------------------------------------------------------

// Header cells arrive as "First Name", "first-name", "FIRSTNAME"... Reduce
// each to snake_case and map the common spellings onto the expected keys.
const ALIASES = {
  id: 'donor_id',
  donorid: 'donor_id',
  constituent_id: 'donor_id',
  firstname: 'first_name',
  first: 'first_name',
  lastname: 'last_name',
  last: 'last_name',
  organization: 'last_name',
  address: 'address_1',
  address1: 'address_1',
  street: 'address_1',
  address2: 'address_2',
  apt: 'address_2',
  postal_code: 'zip',
  zip_code: 'zip',
  zipcode: 'zip',
  lastgift: 'last_gift',
  last_gift_amount: 'last_gift',
  hpc: 'last_gift',
};

export const normalizeHeader = (h) => {
  const k = String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return ALIASES[k] || ALIASES[k.replace(/_/g, '')] || k;
};

/** RFC 4180-ish: quoted cells, doubled quotes, commas and newlines inside quotes. */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!header) return { donors: [], columns: [] };
  const columns = header.map(normalizeHeader);
  const donors = body.map((r, i) => {
    const d = Object.fromEntries(columns.map((k, j) => [k, r[j] ?? '']));
    if (!d.donor_id) d.donor_id = `ROW-${i + 2}`;
    return d;
  });
  return { donors, columns };
}

export function toCSV(donors) {
  const columns = [...new Set(donors.flatMap((d) => Object.keys(d)))];
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
  return [columns.join(','), ...donors.map((d) => columns.map((k) => esc(d[k] ?? '')).join(','))].join('\n');
}
