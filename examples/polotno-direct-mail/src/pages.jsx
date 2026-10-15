import React from 'react';
import { observer } from 'mobx-react-lite';

// Front / Address side thumbnails under the canvas, the same pattern as the
// business card demo: one side on the canvas at a time, both sides in reach.
// Thumbnails re-render shortly after any change to the design.

export const PageStrip = observer(({ store }) => {
  const [thumbs, setThumbs] = React.useState({});

  React.useEffect(() => {
    let t;
    let live = true;
    const render = async () => {
      const next = {};
      for (const page of store.pages) {
        try {
          next[page.id] = await store.toDataURL({ pageId: page.id, pixelRatio: 220 / store.width });
        } catch {
          // A page mid-load can't export yet; the next change retries.
        }
      }
      if (live) setThumbs(next);
    };
    const schedule = () => {
      clearTimeout(t);
      t = setTimeout(render, 400);
    };
    const off = store.on('change', schedule);
    schedule();
    return () => {
      live = false;
      clearTimeout(t);
      if (typeof off === 'function') off();
    };
  }, [store]);

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
      {store.pages.map((page, i) => {
        const active = page.id === store.activePage?.id;
        return (
          <button
            key={page.id}
            onClick={() => store.selectPage(page.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span
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
              {thumbs[page.id] && <img src={thumbs[page.id]} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />}
            </span>
            <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
              {page.custom?.side || `Page ${i + 1}`}
            </span>
          </button>
        );
      })}
    </div>
  );
});
