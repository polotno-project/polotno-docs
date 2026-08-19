import React from 'react';
import { EDITOR_ACCENT_COLOR } from 'polotno/canvas/workspace-style';

import { CALLOUT_DEFAULTS } from './callout-geometry';

const clamp = (value) => Math.max(0, Math.min(1, value));

/**
 * A small pad to point the tail. Drag the dot: the position of the dot is
 * `tipX` / `tipY`, the same fractions the geometry uses. The dashed shape
 * shows where the body of the balloon is.
 */
export const TailPad = ({
  shape,
  tipX,
  tipY,
  inset = CALLOUT_DEFAULTS.inset,
  onChange,
}) => {
  const ref = React.useRef(null);
  const frame = React.useRef(0);

  // A mouse can send more events than the screen can draw, and each change
  // makes the editor draw the balloon again. One change per frame is enough.
  const point = (event) => {
    const box = ref.current.getBoundingClientRect();
    const next = {
      tipX: clamp((event.clientX - box.left) / box.width),
      tipY: clamp((event.clientY - box.top) / box.height),
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => onChange(next));
  };

  return (
    <div
      ref={ref}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        point(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons) point(event);
      }}
      style={{
        position: 'relative',
        height: '110px',
        border: '1px solid rgba(128,128,128,0.4)',
        borderRadius: '6px',
        cursor: 'crosshair',
        touchAction: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: `${inset * 100}%`,
          border: '1px dashed rgba(128,128,128,0.7)',
          borderRadius: shape === 'ellipse' ? '50%' : '6px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${tipX * 100}%`,
          top: `${tipY * 100}%`,
          width: '12px',
          height: '12px',
          margin: '-6px 0 0 -6px',
          borderRadius: '50%',
          background: EDITOR_ACCENT_COLOR,
          boxShadow: '0 0 0 2px #fff',
        }}
      />
    </div>
  );
};
