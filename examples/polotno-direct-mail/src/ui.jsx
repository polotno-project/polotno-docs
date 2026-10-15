import React from 'react';

// Small shared pieces of the demo's own chrome. The editor itself is Polotno's;
// everything here sits around it, styled with the Studio theme tokens.

const ico = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Icons = {
  braces: () => (
    <svg {...ico}><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" /><path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" /></svg>
  ),
  users: () => (
    <svg {...ico}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  chevron: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a8a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  ),
  left: () => <svg {...ico}><path d="m15 18-6-6 6-6" /></svg>,
  right: () => <svg {...ico}><path d="m9 18 6-6-6-6" /></svg>,
  download: () => (
    <svg {...ico}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>
  ),
  upload: () => (
    <svg {...ico}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></svg>
  ),
};

export const STEPS = [
  { id: 'format', label: 'Format' },
  { id: 'donors', label: 'Donor list' },
  { id: 'design', label: 'Fields' },
  { id: 'versions', label: 'Versions' },
  { id: 'proof', label: 'Proof & export' },
];

export function Stepper({ current, onStep, ready }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {STEPS.map(({ id, label }, i) => {
        const active = id === current;
        const disabled = i > 0 && !ready;
        return (
          <React.Fragment key={id}>
            <button
              onClick={() => !disabled && onStep(id)}
              disabled={disabled}
              style={{
                padding: '7px 16px',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: 'none',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? 'var(--primary-foreground)' : disabled ? '#bdbdbd' : 'var(--foreground)',
              }}
            >
              {i + 1}. {label}
            </button>
            {i < STEPS.length - 1 && <Icons.chevron />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

const SEGMENT_COLORS = {
  active: { bg: '#defbe6', fg: '#0e6027' },
  lapsed: { bg: '#fcf4d6', fg: '#8e6a00' },
  new: { bg: '#e5f6ff', fg: '#00539a' },
};

export function SegmentTag({ segment }) {
  const c = SEGMENT_COLORS[segment] || SEGMENT_COLORS.active;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        background: c.bg,
        color: c.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {segment}
    </span>
  );
}

const LEVEL = {
  error: { color: '#da1e28', mark: '●' },
  warn: { color: '#b28600', mark: '●' },
  note: { color: '#6f6f6f', mark: '○' },
  ok: { color: '#198038', mark: '✓' },
};

export function Issue({ level, children }) {
  const l = LEVEL[level] || LEVEL.note;
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.45, color: 'var(--foreground)' }}>
      <span style={{ color: l.color, flex: '0 0 auto', width: 12 }}>{l.mark}</span>
      <span>{children}</span>
    </div>
  );
}

export const Label = ({ children, style }) => (
  <div
    style={{
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: 'var(--muted-foreground)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Token = ({ children }) => (
  <code style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#161616', whiteSpace: 'nowrap' }}>{`{{${children}}}`}</code>
);

export const bar = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 16px',
  background: 'var(--background)',
  borderBottom: '1px solid var(--border)',
  flex: '0 0 auto',
};

export function plainButton(extra) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 34,
    padding: '0 12px',
    fontFamily: 'inherit',
    fontSize: 13,
    color: 'var(--foreground)',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    ...extra,
  };
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
