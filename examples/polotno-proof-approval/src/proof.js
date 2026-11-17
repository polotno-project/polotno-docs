import { observable, runInAction, toJS } from 'mobx';

// Proof state. A real product keeps versions and comments on its server; the
// demo keeps them in memory, so a reload starts over.
//
// version: { n, json, thumb, sentAt, status: 'waiting' | 'approved' | 'changes',
//            decidedAt, comments: [{ id, elementId, label, text }] }
export const app = observable({
  view: 'designer', // 'designer' | 'customer'
  versions: [],
  draft: null, // the designer's working copy while the customer is reviewing
});

const LOCKS = { draggable: false, resizable: false, removable: false, contentEditable: false, styleEditable: false };

export const latest = () => app.versions[app.versions.length - 1];

const mapChildren = (json, fn) => {
  const walk = (children) =>
    children.flatMap((el) => {
      const next = fn(el);
      if (!next) return [];
      return [next.children ? { ...next, children: walk(next.children) } : next];
    });
  return { ...json, pages: json.pages.map((p) => ({ ...p, children: walk(p.children) })) };
};

/** The design without the comment pins: what a version stores and what prints. */
const withoutPins = (json) => mapChildren(json, (el) => (el.custom?.pin ? null : el));
/** The customer reviews; nothing moves. Selecting an element is still allowed. */
const locked = (json) => mapChildren(json, (el) => ({ ...el, ...LOCKS }));

const pinSvg = (n) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#e5484d" stroke="#ffffff" stroke-width="3"/><text x="20" y="27" font-family="Arial" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${n}</text></svg>`
  )}`;

// Numbered pins on the elements the comments are about. They are elements too,
// but marked so they never print and never reach a version.
function withPins(json, comments) {
  const page = json.pages[0];
  const els = new Map(page.children.map((el) => [el.id, el]));
  const size = Math.min(json.width, json.height) * 0.06;
  const pins = comments
    .map((c, i) => [els.get(c.elementId), i + 1])
    .filter(([el]) => el)
    .map(([el, n]) => ({
      type: 'svg',
      id: `pin-${n}`,
      src: pinSvg(n),
      x: el.x + el.width - size / 2,
      y: el.y - size / 2,
      width: size,
      height: size,
      custom: { pin: true },
      showInExport: false,
      selectable: false,
      alwaysOnTop: true,
      ...LOCKS,
    }));
  return { ...json, pages: [{ ...page, children: [...page.children, ...pins] }, ...json.pages.slice(1)] };
}

// One loadJSON per view change, so pins never land in the undo history.
const load = (store, json, comments) => store.loadJSON(withPins(json, comments));

export async function sendProof(store) {
  const json = withoutPins(store.toJSON());
  const thumb = await store.toDataURL({ pixelRatio: 160 / store.width });
  runInAction(() => {
    app.versions.push({ n: app.versions.length + 1, json, thumb, sentAt: new Date(), status: 'waiting', decidedAt: null, comments: [] });
  });
  openCustomer(store);
}

export function openCustomer(store) {
  const v = latest();
  if (!v) return;
  runInAction(() => {
    if (app.view === 'designer') app.draft = withoutPins(store.toJSON());
    app.view = 'customer';
  });
  load(store, locked(toJS(v.json)), v.comments);
}

export function openDesigner(store) {
  if (app.view === 'designer') return;
  const v = latest();
  runInAction(() => (app.view = 'designer'));
  if (app.draft) load(store, toJS(app.draft), v ? v.comments : []);
}

export function addComment(store, text) {
  const v = latest();
  const el = store.selectedElements[0];
  if (!v || !el || !text.trim()) return false;
  runInAction(() => {
    v.comments.push({ id: `${Date.now()}`, elementId: el.id, label: el.name || el.type, text: text.trim() });
  });
  load(store, locked(toJS(v.json)), v.comments);
  return true;
}

export function decide(status) {
  const v = latest();
  if (!v) return;
  runInAction(() => {
    v.status = status;
    v.decidedAt = new Date();
  });
}
