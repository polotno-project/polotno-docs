import React from 'react';
import { observer } from 'mobx-react-lite';

import { email } from './email.js';

// Drawn over each page (the canvas's PageControls slot): a red outline on every
// text the export will send as an image, amber on text some clients show
// differently. It updates after each background export.
const STYLE = {
  'text-rasterized': { color: '#dc2626', label: 'Sent as image' },
  'text-approximated': { color: '#d97706', label: 'Differs in Gmail/Outlook' },
};

export const EmailOverlay = observer(({ store, page, xPadding, yPadding }) => {
  const scale = store.scale;
  const marks = email.warnings.filter((w) => STYLE[w.code] && w.pageId === page.id && w.elementId);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {marks.map((w) => {
        const el = store.getElementById(w.elementId);
        if (!el) return null;
        const { color, label } = STYLE[w.code];
        return (
          <div
            key={w.code + w.elementId}
            style={{
              position: 'absolute',
              left: xPadding + el.x * scale - 3,
              top: yPadding + el.y * scale - 3,
              width: el.width * scale + 6,
              height: el.height * scale + 6,
              border: `2px dashed ${color}`,
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -18,
                left: -2,
                background: color,
                color: '#fff',
                fontSize: 10,
                lineHeight: '16px',
                padding: '0 5px',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                borderRadius: 4,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
});
