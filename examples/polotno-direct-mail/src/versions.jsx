import React from 'react';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { PolotnoContainer, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { Input } from 'polotno/primitives';
import { app } from './state.js';
import { FORMATS } from './spec.js';
import { PHOTOS, SEGMENT_IDS, normalizeSegment, parseGift } from './campaign.js';
import { coverCrop } from './templates.js';
import { Label, bar } from './ui.jsx';
import { PageStrip } from './pages.jsx';

// The Versions step: the card as one donor group sees it. {{headline}} and
// {{opening}} show that group's copy in place, and typing on the card edits
// the group's copy. Everything else on the card is fixed here; it was settled
// in the Fields step.

const VERSIONED = ['headline', 'opening'];
const stripTags = (s) => String(s).replace(/<[^>]+>/g, '');

/**
 * The template with one group's copy and photo in it. Each text holding a
 * versioned field remembers what surrounds the field, so an edit can be read
 * back into the group's copy.
 */
function versionView(template, seg) {
  const photo = PHOTOS[seg.photo];
  const json = structuredClone(template);
  json.pages.forEach((page) => {
    page.children = page.children.filter((el) => !el.custom?.overlay);
    page.children.forEach((el) => {
      el.selectable = false;
      if (el.custom?.variable === 'segment_photo') {
        Object.assign(el, { src: photo.src.replace('w=2400', 'w=1200') }, coverCrop(el.width, el.height, photo.width, photo.height));
        return;
      }
      if (el.type !== 'text' || typeof el.text !== 'string') return;
      const field = VERSIONED.find((f) => el.text.includes(`{{${f}}}`));
      if (!field) return;
      const [prefix, suffix] = el.text.split(`{{${field}}}`);
      Object.assign(el, {
        text: `${prefix}${seg[field]}${suffix}`,
        selectable: true,
        draggable: false,
        resizable: false,
        removable: false,
        styleEditable: false,
        custom: { ...el.custom, version: { field, prefix, suffix } },
      });
    });
  });
  return json;
}

const GroupSwitch = observer(() => {
  const counts = Object.fromEntries(SEGMENT_IDS.map((id) => [id, 0]));
  app.donors.forEach((d) => counts[normalizeSegment(d.segment, parseGift(d.last_gift))]++);
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
      {SEGMENT_IDS.map((id) => {
        const active = app.versionGroup === id;
        return (
          <button
            key={id}
            onClick={() => (app.versionGroup = id)}
            style={{
              height: 34,
              padding: '0 14px',
              fontFamily: 'inherit',
              fontSize: 13,
              border: 'none',
              cursor: 'pointer',
              background: active ? 'var(--primary)' : 'var(--card)',
              color: active ? 'var(--primary-foreground)' : 'var(--foreground)',
            }}
          >
            {app.campaign.segments[id].label} · {counts[id]}
          </button>
        );
      })}
    </div>
  );
});

const GroupPanel = observer(() => {
  const seg = app.campaign.segments[app.versionGroup];
  return (
    <aside style={{ flex: '0 0 300px', width: 300, overflowY: 'auto', borderLeft: '1px solid var(--border)', background: 'var(--background)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{seg.label}</div>
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{seg.who}</div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>Click the headline or the opening on the card to rewrite it for this group.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', borderBottom: '1px solid #e0e0e0' }}>
        <Label>Photo</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {Object.entries(PHOTOS).map(([key, p]) => (
            <button
              key={key}
              title={p.label}
              onClick={() => (seg.photo = key)}
              style={{
                padding: 0,
                aspectRatio: '1',
                border: seg.photo === key ? '2px solid var(--primary)' : '2px solid transparent',
                background: `#eee url(${p.thumb}) center/cover`,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px', borderBottom: '1px solid #e0e0e0' }}>
        <Label>Gift amounts</Label>
        <div style={{ fontSize: 13 }}>{seg.askRule}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px' }}>
        <Label>Match deadline, all groups</Label>
        <Input style={{ width: '100%', boxSizing: 'border-box' }} value={app.campaign.matchDeadline} onChange={(e) => (app.campaign.matchDeadline = e.target.value)} />
      </div>
    </aside>
  );
});

export const VersionsStep = observer(({ store, viewStore }) => {
  const [template] = React.useState(() => store.toJSON());
  const seg = app.campaign.segments[app.versionGroup];

  // Rebuild the card when the group or its photo changes. Not on copy edits:
  // those come from the card itself.
  React.useEffect(() => {
    const side = Math.max(0, viewStore.pages.findIndex((p) => p.id === viewStore.activePage?.id));
    viewStore.loadJSON(versionView(template, seg));
    if (viewStore.pages[side]) viewStore.selectPage(viewStore.pages[side].id);
    viewStore.toggleBleed(FORMATS[app.formatId].bleedIn > 0);
  }, [app.versionGroup, seg.photo]);

  // Typing on the card writes back into the group's copy, as long as the edit
  // stayed inside the field. Text around it belongs to the template.
  React.useEffect(
    () =>
      reaction(
        () =>
          viewStore.pages.flatMap((p) => p.children.filter((el) => el.custom?.version).map((el) => [el.custom.version, el.text])),
        (rows) =>
          rows.forEach(([{ field, prefix, suffix }, text]) => {
            const t = stripTags(text);
            if (t.startsWith(prefix) && t.endsWith(suffix)) {
              seg[field] = t.slice(prefix.length, t.length - suffix.length).trim();
            }
          })
      ),
    [seg]
  );

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...bar, height: 52 }}>
          <GroupSwitch />
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0 }}>
          <PolotnoContainer style={{ width: '100%', height: '100%' }}>
            <WorkspaceWrap>
              {/* No floating element bar: here a text can be retyped, nothing more. */}
              <Workspace store={viewStore} renderOnlyActivePage backgroundColor="#f4f4f4" components={{ PageControls: () => null, Tooltip: () => null }} />
              <ZoomButtons store={viewStore} />
              <PageStrip store={viewStore} />
            </WorkspaceWrap>
          </PolotnoContainer>
        </div>
      </div>
      <GroupPanel />
    </div>
  );
});
