// Checks that run before anything is printed: against the template (is
// anything sitting in a USPS zone?) and against every merged donor piece.

import { inch } from './spec.js';
import { addressProblem } from './campaign.js';

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Elements on the address side that sit in a zone they don't own. Works on
 * live store elements and on plain JSON alike.
 */
export function zoneConflicts(page, format) {
  if (!page) return [];
  const zones = format.zones.map((z) => ({ ...z, x: inch(z.x), y: inch(z.y), w: inch(z.w), h: inch(z.h) }));
  const out = [];
  page.children.forEach((el) => {
    if (el.custom?.overlay || el.visible === false || el.showInExport === false) return;
    const box = { x: el.x, y: el.y, w: el.width, h: el.height };
    zones.forEach((z) => {
      // A pixel of tolerance so an element butting up against a zone edge
      // isn't reported as inside it.
      const inner = { x: z.x + 2, y: z.y + 2, w: z.w - 4, h: z.h - 4 };
      if (el.custom?.zoneOwner !== z.id && overlaps(box, inner)) {
        out.push({ elementId: el.id, element: el.name || el.type, zone: z.id, zoneLabel: z.label, zoneNoun: z.noun });
      }
    });
  });
  return out;
}

/**
 * The whole-list report. `merged` is one mergeDonor() result per donor, in
 * list order.
 */
export function listReport(donors, merged, conflicts) {
  const rows = donors.map((d, i) => {
    const m = merged[i];
    const address = addressProblem(d);
    const issues = [];
    if (address) issues.push({ level: 'error', text: `Can't be mailed: ${address.toLowerCase()}` });
    m?.unfilled.forEach((k) => issues.push({ level: 'error', text: `{{${k}}} has no matching column in the list` }));
    m?.fitNotes.forEach((n) => issues.push(n));
    m?.notes.forEach((t) => issues.push({ level: 'note', text: t }));
    return { index: i, donor: d, issues, mailable: !address };
  });
  const count = (pred) => rows.filter(pred).length;
  const unfilled = [...new Set(merged.flatMap((m) => m?.unfilled || []))];
  return {
    rows,
    mailable: count((r) => r.mailable),
    unmailable: count((r) => !r.mailable),
    shrunk: count((r) => r.issues.some((x) => x.text.includes('shrunk'))),
    tooLong: count((r) => r.issues.some((x) => x.level === 'warn')),
    fallbacks: count((r) => r.issues.some((x) => x.text.startsWith('No first name'))),
    unfilled,
    conflicts,
  };
}
