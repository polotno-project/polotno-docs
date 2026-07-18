import React from 'react';

/* ---------- icons (simple, Studio-monochrome, inherit currentColor) ---------- */

const ico = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const StyleIcon = () => (
  <svg {...ico}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
);
export const DesignIcon = () => (
  <svg {...ico}><circle cx="13.5" cy="6.5" r="2.5" /><circle cx="6.5" cy="12" r="2.5" /><circle cx="15" cy="16.5" r="2.5" /><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2" /></svg>
);
export const WriteIcon = () => (
  <svg {...ico}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a8a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);
export const DownloadIcon = () => (
  <svg {...ico}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>
);
const Caret = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}><path d="m6 9 6 6 6-6" /></svg>
);

/* ---------- top stepper: Style › Design › Write ---------- */

const STEPS = [
  { id: 'Style', label: 'Style' },
  { id: 'Design', label: 'Front' },
  { id: 'Write', label: 'Back' },
];

export function Stepper({ current, onStep, hasTemplate }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {STEPS.map(({ id, label }, i) => {
        const active = id === current;
        const disabled = i >= 1 && !hasTemplate;
        return (
          <React.Fragment key={id}>
            <button
              onClick={() => !disabled && onStep(id)}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '7px 18px',
                minWidth: 108,
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: 'none',
                background: active ? 'var(--primary)' : 'transparent',
                color: active
                  ? 'var(--primary-foreground)'
                  : disabled
                  ? '#bdbdbd'
                  : 'var(--foreground)',
              }}
            >
              {i + 1}. {label}
            </button>
            {i < STEPS.length - 1 && <Chevron />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* ---------- generic dropdown (trigger + panel, closes on outside click) ------ */

function Dropdown({ trigger, children, width = 220 }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 38,
          padding: '0 12px',
          fontFamily: 'inherit',
          fontSize: 14,
          color: 'var(--foreground)',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        {trigger}
        <Caret />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 20,
            width,
            padding: 12,
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(22,22,22,0.16)',
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const Label = ({ children }) => (
  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)' }}>{children}</span>
);

const normColor = (v) => (v || '').toLowerCase().replace(/\s+/g, '');

function toHexColor(c) {
  if (!c) return '#000000';
  const s = c.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  const m = s.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) {
    const h = (n) => (+n).toString(16).padStart(2, '0');
    return '#' + h(m[1]) + h(m[2]) + h(m[3]);
  }
  return '#000000';
}

export function ColorDropdown({ label, colors, activeColor, onSelect, disabledColor }) {
  return (
    <Dropdown
      width={200}
      trigger={
        <>
          <span
            style={{
              width: 18,
              height: 18,
              background: activeColor || '#ffffff',
              border: '1px solid var(--border)',
              display: 'inline-block',
            }}
          />
          <Label>{label}</Label>
        </>
      }
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {colors.map((c) => {
          const disabled = disabledColor && normColor(disabledColor) === normColor(c);
          const active = normColor(activeColor) === normColor(c);
          return (
            <button
              key={c}
              aria-label={c}
              disabled={disabled}
              onClick={() => !disabled && onSelect(c)}
              title={disabled ? 'Already used by the other option' : c}
              style={{
                width: 30,
                height: 30,
                background: c,
                opacity: disabled ? 0.25 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
              }}
            />
          );
        })}
        {/* custom colour picker (last option) */}
        <label
          title="Custom colour"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: 30,
            height: 30,
            cursor: 'pointer',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1, textShadow: '0 0 2px rgba(0,0,0,0.6)' }}>
            +
          </span>
          <input
            type="color"
            value={toHexColor(activeColor)}
            onChange={(e) => onSelect(e.target.value)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 'none', padding: 0, cursor: 'pointer' }}
          />
        </label>
      </div>
    </Dropdown>
  );
}

export function FontDropdown({ fonts, activeFont, onSelect }) {
  return (
    <Dropdown
      width={200}
      trigger={<span style={{ fontFamily: activeFont, fontSize: 14 }}>{activeFont || 'Font'}</span>}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {fonts.map((f) => (
          <button
            key={f}
            onClick={() => onSelect(f)}
            style={{
              textAlign: 'left',
              padding: '8px 8px',
              fontFamily: f,
              fontSize: 16,
              cursor: 'pointer',
              border: 'none',
              background: f === activeFont ? 'var(--accent)' : 'transparent',
              color: 'var(--foreground)',
            }}
          >
            {f}
          </button>
        ))}
      </div>
    </Dropdown>
  );
}

// Free size field — type any px value. The extra attributes keep password managers
// (Dashlane/1Password/LastPass) from injecting their icon into the input.
export function SizeInput({ value, onChange }) {
  const [local, setLocal] = React.useState(value ?? 24);
  React.useEffect(() => {
    setLocal(value ? Math.round(value) : 24);
  }, [value]);
  const clamp = (n) => Math.max(6, Math.min(400, Math.round(Number(n) || 0)));
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 38,
        padding: '0 10px',
        border: '1px solid var(--border)',
        background: 'var(--card)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted-foreground)' }}>Size</span>
      <input
        type="number"
        min="6"
        max="400"
        value={local}
        autoComplete="off"
        data-1p-ignore=""
        data-lpignore="true"
        data-form-type="other"
        data-dashlane-ignore="true"
        onChange={(e) => {
          setLocal(e.target.value);
          const n = Number(e.target.value);
          if (n >= 6 && n <= 400) onChange(Math.round(n));
        }}
        onBlur={(e) => {
          const n = clamp(e.target.value);
          setLocal(n);
          onChange(n);
        }}
        style={{
          width: 48,
          height: 26,
          border: 'none',
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize: 14,
          color: 'var(--foreground)',
          outline: 'none',
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>px</span>
    </label>
  );
}

/* ---------- Replace-photo side panel (opens when a placeholder is selected) ---------- */

export function ReplacePhotoPanel({ examples, onPick, onUpload, onClose }) {
  return (
    <div
      style={{
        flex: '0 0 300px',
        width: 300,
        borderLeft: '1px solid var(--border)',
        background: 'var(--background)',
        padding: 16,
        overflowY: 'auto',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Replace photo</span>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--muted-foreground)' }}
        >
          ×
        </button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted-foreground)' }}>
        Pick an example or upload your own. Double-click the photo to crop.
      </p>

      <button
        onClick={onUpload}
        style={{
          width: '100%',
          height: 40,
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 14,
          color: 'var(--primary-foreground)',
          background: 'var(--primary)',
          border: '1px solid var(--primary)',
        }}
      >
        ⬆ Upload your own photo
      </button>

      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: 'var(--muted-foreground)',
          marginBottom: 8,
        }}
      >
        Examples
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {examples.map((url, i) => (
          <button
            key={i}
            onClick={() => onPick(url)}
            title="Use this photo"
            style={{
              padding: 0,
              height: 84,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: `center/cover no-repeat url(${url})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Style step: template grid ---------- */

export function TemplateGrid({ templates, onChoose }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f4f4',
      }}
    >
      <div style={{ width: '100%', maxWidth: 760, padding: 40 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--foreground)' }}>
          Pick a card to start
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--muted-foreground)' }}>
          Choose a greeting card — you&rsquo;ll design the front, then write the back.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {templates.map(({ id, name, preview }) => (
            <button
              key={id}
              onClick={() => onChoose(id)}
              style={{
                padding: 0,
                cursor: 'pointer',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                textAlign: 'left',
                boxShadow: '0 6px 16px rgba(22,22,22,0.10)',
              }}
            >
              {/* static preview of the card front (3:2) — the heavy scene JSON is
                  only loaded once the card is picked */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '3 / 2',
                  background: preview
                    ? `center/cover no-repeat url(${preview})`
                    : 'var(--secondary)',
                }}
              />
              <div style={{ padding: '12px 14px', fontSize: 15, fontWeight: 500, color: 'var(--foreground)' }}>
                {name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
