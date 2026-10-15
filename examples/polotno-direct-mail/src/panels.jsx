import React from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Braces } from 'lucide-react';
import { app } from './state.js';
import { LIST_FIELDS, DERIVED_FIELDS, FONTS, COLORS, deriveFields, columnLabel } from './campaign.js';
import { pt } from './spec.js';
import { Token } from './ui.jsx';

// The side-panel section added to Polotno's own: the fields a design can use.

const help = { fontSize: 13, lineHeight: 1.5, color: 'var(--muted-foreground)', margin: 0 };

// Put a field into the selected text, or into a new text box when nothing
// editable is selected.
function insertField(store, key) {
  const token = `{{${key}}}`;
  const el = store.selectedElements[0];
  if (el?.type === 'text' && el.contentEditable !== false) {
    el.set({ text: `${el.text} ${token}` });
    return;
  }
  const page = store.activePage;
  if (!page) return;
  const width = store.width * 0.4;
  const added = page.addElement({
    type: 'text',
    text: token,
    x: (store.width - width) / 2,
    y: store.height * 0.45,
    width,
    fontSize: pt(16),
    fontFamily: FONTS.sans,
    fill: COLORS.ink,
  });
  store.selectElements([added.id]);
}

const FieldRow = ({ store, field, sample }) => (
  <button
    onClick={() => insertField(store, field.key)}
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      width: '100%',
      padding: '8px 10px',
      textAlign: 'left',
      fontFamily: 'inherit',
      background: 'var(--card)',
      border: '1px solid #e0e0e0',
      cursor: 'pointer',
    }}
  >
    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <Token>{field.key}</Token>
      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{field.label}</span>
    </span>
    {field.note && <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{field.note}</span>}
    {sample && (
      <span style={{ fontSize: 12, color: '#a8a8a8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>e.g. {sample}</span>
    )}
  </button>
);

// An example for each field from the first donor who has a value for it, so
// a field most donors leave blank (an apartment line) still shows one.
function examples() {
  const out = {};
  for (const d of app.donors) {
    const { values } = deriveFields(d, app.campaign);
    for (const [k, v] of Object.entries(values)) if (!out[k] && v) out[k] = v;
  }
  return out;
}

const GROUPS = [
  { id: 'list', label: 'From the list' },
  { id: 'derived', label: 'Per donor' },
];

const FieldsPanel = observer(({ store }) => {
  const sample = examples();
  const extra = app.extraColumns.map((key) => ({ key, label: columnLabel(key) }));
  const scrollRef = React.useRef(null);
  const refs = { list: React.useRef(null), derived: React.useRef(null) };
  const [active, setActive] = React.useState('list');

  // The tabs jump to their group; scrolling moves the highlight with it.
  const jump = (id) => {
    const box = scrollRef.current;
    box.scrollTo({ top: refs[id].current.offsetTop - box.offsetTop - 52, behavior: 'smooth' });
  };
  const onScroll = () => {
    const box = scrollRef.current;
    setActive(box.scrollTop + 60 >= refs.derived.current.offsetTop - box.offsetTop - 52 ? 'derived' : 'list');
  };

  return (
    <div ref={scrollRef} onScroll={onScroll} style={{ height: '100%', overflowY: 'auto', position: 'relative', scrollbarGutter: 'stable' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        {GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => jump(g.id)}
            style={{
              flex: 1,
              height: 40,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: active === g.id ? 600 : 400,
              color: active === g.id ? 'var(--foreground)' : 'var(--muted-foreground)',
              background: 'none',
              border: 'none',
              borderBottom: active === g.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '12px 10px 24px 4px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={help}>Every {'{{field}}'} on the card is filled in for each donor. Click a field to add it to the selected text.</p>
        <div ref={refs.list} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>From the list</div>
          <p style={{ ...help, fontSize: 12, marginBottom: 4 }}>Columns in the donor list, as they are.</p>
          {[...LIST_FIELDS, ...extra].map((f) => (
            <FieldRow key={f.key} store={store} field={f} sample={sample[f.key]} />
          ))}
        </div>
        <div ref={refs.derived} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Per donor</div>
          <p style={{ ...help, fontSize: 12, marginBottom: 4 }}>Worked out from the list for each donor. Your platform decides how.</p>
          {DERIVED_FIELDS.map((f) => (
            <FieldRow key={f.key} store={store} field={f} sample={sample[f.key]} />
          ))}
        </div>
      </div>
    </div>
  );
});

export const FieldsSection = {
  name: 'fields',
  Tab: (props) => (
    <SectionTab name="Fields" {...props}>
      <Braces />
    </SectionTab>
  ),
  Panel: FieldsPanel,
};
