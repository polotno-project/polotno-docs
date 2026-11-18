// shadcn/ui design tokens, read the way Polotno's own components read them
// (`--pn-x`, then `--x`, then the stock shadcn value), so this demo's own
// markup matches the editor around it.
const v = (name, fallback) => `var(--pn-${name}, var(--${name}, ${fallback}))`;

export const T = {
  background: v('background', '#ffffff'),
  foreground: v('foreground', '#0a0a0a'),
  card: v('card', '#ffffff'),
  muted: v('muted', '#f5f5f5'),
  mutedForeground: v('muted-foreground', '#737373'),
  border: v('border', '#e5e5e5'),
  primary: v('primary', '#171717'),
  destructive: v('destructive', '#dc2626'),
  radius: v('radius', '0.625rem'),
};

export const S = {
  panel: { display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto', fontSize: 14 },
  card: {
    border: `1px solid ${T.border}`,
    borderRadius: T.radius,
    background: T.card,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  title: { fontWeight: 600, fontSize: 14, margin: 0, color: T.foreground },
  muted: { color: T.mutedForeground, fontSize: 13, lineHeight: 1.5, margin: 0 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 36 },
};

// shadcn Badge variants.
const badge = { display: 'inline-flex', alignItems: 'center', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 500, lineHeight: '16px' };
export const BADGE = {
  destructive: { ...badge, background: T.destructive, color: '#fff' },
  warning: { ...badge, background: '#fef3c7', color: '#92400e' },
  secondary: { ...badge, background: T.muted, color: T.foreground },
  outline: { ...badge, border: `1px solid ${T.border}`, color: T.foreground },
};
