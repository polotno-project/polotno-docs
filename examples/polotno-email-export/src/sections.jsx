import React from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab, PhotosSection, UploadSection } from 'polotno/side-panel';
import { ColorPicker } from 'polotno/toolbar/color-picker';
import { Button, NumberInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'polotno/primitives';

import { Icons } from './icons.jsx';
import { CONTENT, BLOCKS } from './blocks.js';
import { insertBlock, fitHeight } from './layout.js';
import { email, setFont, setCard, DESKTOP, MOBILE } from './email.js';
import { fixesFor } from './fixes.js';
import { S, T, BADGE } from './ui.js';

const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 };

// An outline Button laid out as a tile: icon over label.
const Tile = ({ icon, label, onClick }) => (
  <Button variant="outline" onClick={onClick} style={{ height: 76, flexDirection: 'column', gap: 6, fontWeight: 400 }}>
    {icon}
    <span style={{ fontSize: 13 }}>{label}</span>
  </Button>
);

const add = (store, builder) => {
  const page = store.activePage;
  const block = builder(page.computedWidth, email.theme);
  store.history.transaction(() => {
    const added = insertBlock(store, page, block);
    if (added.length) store.selectElements([added[added.length - 1].id]);
  });
};

// ---------- Content ----------

const MERGE_TAGS = ['{{first_name}}', '{{company}}', '{{plan}}'];

const ContentPanel = observer(({ store }) => {
  const text = store.selectedElements.find((el) => el.type === 'text');
  return (
    <div style={S.panel}>
      <div style={grid}>
        {CONTENT.map((c) => (
          <Tile key={c.name} icon={Icons[c.name]({ size: 20 })} label={c.label} onClick={() => add(store, c.build)} />
        ))}
      </div>
      <p style={S.muted}>New content goes under the selected element, or at the end. Everything below moves down.</p>
      <div>
        <p style={S.title}>Merge tags</p>
        <p style={{ ...S.muted, marginTop: 4, marginBottom: 8 }}>
          {text ? 'Click to add to the selected text.' : 'Select a text to add a merge tag.'} Live text keeps the tag in the
          HTML for your email service to fill in.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {MERGE_TAGS.map((tag) => (
            <Button key={tag} variant="outline" size="sm" disabled={!text} onClick={() => text.set({ text: `${text.text} ${tag}` })}>
              {tag}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
});

export const ContentSection = {
  name: 'content',
  Tab: (props) => (
    <SectionTab name="Content" {...props}>
      {Icons.content()}
    </SectionTab>
  ),
  Panel: ContentPanel,
};

// ---------- Blocks ----------

const BlocksPanel = observer(({ store }) => (
  <div style={S.panel}>
    <p style={S.muted}>Ready-made sections. They are added under the selection, at the width of the page you are editing.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {BLOCKS.map((b) => (
        <Button key={b.name} variant="outline" onClick={() => add(store, b.build)} style={{ height: 44, justifyContent: 'flex-start', gap: 10, fontWeight: 400 }}>
          {Icons[b.name]({ size: 16 })}
          {b.label}
        </Button>
      ))}
    </div>
  </div>
));

export const BlocksSection = {
  name: 'blocks',
  Tab: (props) => (
    <SectionTab name="Blocks" {...props}>
      {Icons.blocks()}
    </SectionTab>
  ),
  Panel: BlocksPanel,
};

// ---------- Body ----------

const FONTS = ['Roboto', 'Inter', 'Playfair Display', 'Arial', 'Georgia'];
const FALLBACK = { Roboto: 'Arial', Inter: 'Arial', 'Playfair Display': 'Georgia' };

const FontRow = observer(({ role, label }) => (
  <div style={S.row}>
    <span>{label}</span>
    <Select value={email.theme[role]} onValueChange={(v) => setFont(role, v)}>
      <SelectTrigger style={{ width: 190 }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FONTS.map((f) => (
          <SelectItem key={f} value={f}>
            {FALLBACK[f] ? `${f} (${FALLBACK[f]})` : f}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
));

// The picker returns rgba(); show it as #RRGGBB.
const toHex = (color) => {
  const m = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return m ? '#' + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('') : String(color);
};

// A colour setting: label, a bordered swatch that opens the picker, the hex.
const ColorRow = ({ label, hint, value, store, onChange }) => (
  <div style={S.row}>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span>{label}</span>
      {hint && <span style={{ ...S.muted, fontSize: 12 }}>{hint}</span>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ ...S.muted, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{toHex(value).toUpperCase()}</span>
      <ColorPicker
        value={value}
        size={28}
        store={store}
        gradientEnabled={false}
        style={{ border: `1px solid ${T.border}`, borderRadius: 6 }}
        onChange={onChange}
      />
    </div>
  </div>
);

const isSection = (el) => el.type === 'figure' && el.name === 'Section';

const BodyPanel = observer(({ store }) => {
  const page = store.activePage;
  const pages = store.pages.filter((p) => p.id === DESKTOP || p.id === MOBILE);
  const isMobile = page.id === MOBILE;
  // Content background: every section block still in the current content
  // colour (a dark call-to-action keeps its own), on both pages, and new blocks.
  const setContent = (color) => {
    const old = email.theme.card;
    store.history.transaction(() =>
      pages.forEach((p) => p.children.filter((el) => isSection(el) && el.fill === old).forEach((el) => el.set({ fill: color })))
    );
    setCard(color);
  };
  return (
    <div style={S.panel}>
      <ColorRow
        label="Email background"
        hint="Around the content, edge to edge"
        value={page.background}
        store={store}
        onChange={(c) => store.history.transaction(() => pages.forEach((p) => p.set({ background: c })))}
      />
      <ColorRow label="Content background" hint="Behind the blocks" value={email.theme.card} store={store} onChange={setContent} />
      <div style={S.row}>
        <span>Content width</span>
        <span style={S.muted}>{isMobile ? '350 px (phones)' : '600 px (fixed)'}</span>
      </div>
      <div style={S.row}>
        <span>Email height</span>
        <NumberInput value={Math.round(page.computedHeight)} min={100} max={20000} onValueChange={(v) => page.set({ height: v })} style={{ width: 90 }} />
      </div>
      <Button variant="outline" onClick={() => fitHeight(page)}>
        Fit height to content
      </Button>
      <FontRow role="heading" label="Heading font" />
      <FontRow role="body" label="Body font" />
      <p style={S.muted}>
        For new content and blocks. Gmail, Outlook and Yahoo show the fallback in brackets; Apple Mail and iOS load the
        font itself.
      </p>
      <p style={S.muted}>
        The desktop page is the email. Below 600 px, clients that read media queries show the mobile page instead. Switch between them at the bottom of the canvas.
      </p>
    </div>
  );
});

export const BodySection = {
  name: 'body',
  Tab: (props) => (
    <SectionTab name="Body" {...props}>
      {Icons.body()}
    </SectionTab>
  ),
  Panel: BodyPanel,
};

// ---------- Audit ----------

const RASTER = {
  rotated: 'Rotated',
  curved: 'Curved',
  'gradient-fill': 'Gradient fill',
  stroke: 'Outline',
  compositing: 'Blend mode',
  effect: 'Blur or other effect',
  'text-box-paint': 'Background box',
  direction: 'Right-to-left',
  justify: 'Justified',
  'tab-stops': 'Tab stops',
  occluded: 'Covered by another element',
  overlap: 'Overlaps another text',
  'fallback-overflow': "Doesn't fit in the fallback font",
  'not-sliceable': 'Layout cannot be split',
  'table-rows': 'Table rows grow with text',
  layered: 'Text over text in a web font',
};
const APPROX = {
  'stroke-dropped': 'Gmail and Outlook drop the outline',
  'shadow-dropped': 'Gmail and Outlook drop the shadow',
  'gradient-solid': 'Gradient shows as one colour',
};

function describe(w) {
  switch (w.code) {
    case 'text-rasterized':
      return { level: 'error', title: 'Text sent as an image', detail: `${RASTER[w.details.reason] || w.details.reason}. Not selectable, hidden when images are off.` };
    case 'text-approximated':
      return { level: 'warn', title: 'Looks different in some clients', detail: w.details.approximations.map((a) => APPROX[a] || a).join('. ') };
    case 'font-fallback':
      return { level: 'info', title: `${w.details.family} falls back to ${w.details.fallback}`, detail: 'Gmail, Outlook and Yahoo do not load web fonts.' };
    case 'text-tight':
      return { level: 'warn', title: 'Line height too tight', detail: 'Classic Outlook may clip the tops of letters.' };
    case 'text-too-small':
      return { level: 'warn', title: 'Text under 14 px', detail: `${Math.round(w.details.fontSize)} px after scaling to the email width.` };
    case 'text-low-contrast':
      return { level: 'warn', title: 'Low contrast with images off', detail: `${w.details.ratio.toFixed(1)}:1 against the cell colour. Aim for 3:1 or more.` };
    case 'html-over-budget':
      return { level: 'error', title: 'Email too large', detail: 'Gmail clips messages near 102 KB.' };
    case 'style-over-budget':
      return { level: 'warn', title: 'Web-font CSS left out', detail: "Over Gmail's 16 KB style limit." };
    default:
      return { level: 'info', title: w.code, detail: w.message };
  }
}

const LEVEL = {
  error: { badge: BADGE.destructive, label: 'Issue' },
  warn: { badge: BADGE.warning, label: 'Check' },
  info: { badge: BADGE.secondary, label: 'Info' },
};
const ORDER = { error: 0, warn: 1, info: 2 };

export const auditCount = () => email.warnings.filter((w) => describe(w).level !== 'info').length;

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

const AuditPanel = observer(({ store }) => {
  const items = email.warnings
    .map((w) => ({ w, ...describe(w), fixes: fixesFor(w, w.elementId && store.getElementById(w.elementId)) }))
    .sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  const fixable = items.filter((i) => i.fixes.length);
  // The first fix of each issue: the one that keeps the design closest.
  const fixAll = () => store.history.transaction(() => fixable.forEach((i) => i.fixes[0].apply()));
  const fix = (f) => store.history.transaction(() => f.apply());
  const select = (w) => {
    if (w.pageId && store.activePage?.id !== w.pageId) store.selectPage(w.pageId);
    if (w.elementId && store.getElementById(w.elementId)) store.selectElements([w.elementId]);
  };
  const { stats } = email;
  return (
    <div style={S.panel}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Stat value={stats.live} label="Live texts" />
        <Stat value={stats.image} label="Texts as images" />
        <Stat value={kb(stats.bytes)} label="of 102 KB" />
      </div>
      <p style={S.muted}>{email.running ? 'Checking…' : 'Checked against Gmail, Outlook, Apple Mail and Yahoo after every edit.'}</p>
      {email.error && (
        <p style={{ ...S.muted, color: T.destructive }}>
          Export failed: {email.error.details?.reason || email.error.code || ''} {email.error.message}
        </p>
      )}
      {items.length === 0 && !email.running && <p style={S.muted}>No issues. Every text is live.</p>}
      {fixable.length > 1 && (
        <Button onClick={fixAll} disabled={email.running}>
          {Icons.fix({ size: 16 })}
          Fix {fixable.length} issues
        </Button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(({ w, level, title, detail, fixes }, i) => (
          <div
            key={i}
            onClick={() => select(w)}
            style={{ ...S.card, cursor: w.elementId ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={LEVEL[level].badge}>{LEVEL[level].label}</span>
              <span style={BADGE.outline}>{w.pageId === MOBILE ? 'Mobile' : 'Desktop'}</span>
            </div>
            <span style={S.title}>{title}</span>
            <span style={S.muted}>{detail}</span>
            {fixes.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {fixes.map((f) => (
                  <Button
                    key={f.label}
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fix(f);
                    }}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        <p style={S.title}>Not in email export yet</p>
        <p style={{ ...S.muted, marginTop: 4 }}>
          Links on buttons and images, image alt text and a preheader. URLs typed in text are linked.
        </p>
      </div>
    </div>
  );
});

const Stat = ({ value, label }) => (
  <div style={{ ...S.card, gap: 2, padding: '10px 12px' }}>
    <div style={{ fontSize: 20, fontWeight: 600, color: T.foreground }}>{value}</div>
    <div style={{ fontSize: 12, color: T.mutedForeground }}>{label}</div>
  </div>
);

const AuditTab = observer((props) => {
  const n = auditCount();
  return (
    <SectionTab name="Audit" {...props}>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        {Icons.audit()}
        {n > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -9,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: T.destructive,
              color: '#fff',
              fontSize: 10,
              lineHeight: '16px',
              textAlign: 'center',
              padding: '0 4px',
            }}
          >
            {n}
          </span>
        )}
      </span>
    </SectionTab>
  );
});

export const AuditSection = { name: 'audit', Tab: AuditTab, Panel: AuditPanel };

export const SECTIONS = [ContentSection, BlocksSection, BodySection, { ...PhotosSection }, { ...UploadSection }, AuditSection];
