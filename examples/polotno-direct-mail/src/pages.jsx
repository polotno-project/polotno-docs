import React from 'react';
import { observer } from 'mobx-react-lite';
import { usePagePreview } from 'polotno/pages-timeline/page-preview';

// Front / Address side thumbnails under the canvas, the same pattern as the
// business card demo: one side on the canvas at a time, both sides in reach.
//
// Thumbnails come from Polotno's own usePagePreview, the hook its pages
// timeline uses. It renders in quick mode, one page at a time, only when a
// page actually changed and not mid-typing, so the live canvas doesn't
// flicker while you edit.

const Thumb = observer(({ store, page, label }) => {
  const ref = React.useRef(null);
  const preview = usePagePreview({ page, ref });
  const active = page.id === store.activePage?.id;
  return (
    <button
      onClick={() => store.selectPage(page.id)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <span
        ref={ref}
        style={{
          display: 'block',
          width: 120,
          aspectRatio: `${store.width} / ${store.height}`,
          lineHeight: 0,
          background: '#e0e0e0',
          border: active ? '2px solid var(--primary)' : '2px solid transparent',
          outline: active ? 'none' : '1px solid var(--border)',
        }}
      >
        {preview && <img src={preview} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />}
      </span>
      <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{label}</span>
    </button>
  );
});

export const PageStrip = observer(({ store }) => {
  if (store.pages.length < 2) return null;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        padding: '10px 16px',
        background: 'var(--background)',
        borderTop: '1px solid var(--border)',
        flex: '0 0 auto',
      }}
    >
      {store.pages.map((page, i) => (
        <Thumb key={page.id} store={store} page={page} label={page.custom?.side || `Page ${i + 1}`} />
      ))}
    </div>
  );
});
