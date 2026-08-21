import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Spinner } from 'polotno/primitives';

import { runPreflight } from './checks.js';
import { PRODUCT } from './spec.js';

// The report is the product here, so it gets a permanent rail rather than a
// dropdown. PolotnoContainer is a flex row — anything rendered after
// <WorkspaceWrap> simply lands on the right. No overrides needed.

// Same five statuses, same swatches, as the file-side checker on
// polotno.com/tools/pdf-preflight (`app/(marketing)/tools/pdf-preflight/
// _preflight.tsx` in the website repo). Separate workspaces, so it cannot be
// imported — retune both or neither.
const STATUS_STYLE = {
  fail: { bg: '#fdeaea', fg: '#a32d2d', label: 'FAIL' },
  warn: { bg: '#fdf3e0', fg: '#8a5b00', label: 'WARN' },
  note: { bg: '#eaf1fb', fg: '#2b4c8c', label: 'NOTE' },
  unknown: { bg: '#f0f0f0', fg: '#5a5a5a', label: '?' },
  pass: { bg: '#e6f4ea', fg: '#1e7e34', label: 'PASS' },
};

// Worst first. A report sorted by document order buries the thing that stops
// the job behind six notes.
const ORDER = { fail: 0, warn: 1, unknown: 2, note: 3, pass: 4 };

const StatusChip = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.unknown;
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        padding: '2px 7px',
        fontSize: 10,
        letterSpacing: '0.09em',
        borderRadius: 3,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {s.label}
    </span>
  );
};

const CheckRow = ({ check, store }) => {
  const select = () => {
    if (!check.elementId) return;
    store.selectElements([check.elementId]);
  };
  return (
    <div
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--pn-border, #e6e6e6)',
        cursor: check.elementId ? 'pointer' : 'default',
      }}
      onClick={select}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <StatusChip status={check.status} />
        <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>
          {check.title}
        </span>
      </div>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.72,
        }}
      >
        {check.detail}
      </p>
      {check.fix && (
        <Button
          variant="secondary"
          size="sm"
          style={{ marginTop: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            check.fix();
          }}
        >
          {check.fixLabel || 'Fix'}
        </Button>
      )}
    </div>
  );
};

export const PreflightPanel = observer(({ store }) => {
  const [report, setReport] = React.useState(null);
  const [running, setRunning] = React.useState(true);

  // Re-run on every change, throttled to one run per 600 ms. Validation
  // touches the network (image sizes) and the text measurer, so it must not
  // run per keystroke — but a throttle rather than a debounce on purpose: the
  // report stays live *during* a drag, so you watch the safe-area row clear as
  // you move the headline, instead of waiting for you to let go.
  React.useEffect(() => {
    let timeout = null;
    let cancelled = false;

    const request = () => {
      if (timeout) return;
      setRunning(true);
      timeout = setTimeout(async () => {
        timeout = null;
        const result = await runPreflight(store);
        if (!cancelled) {
          setReport(result);
          setRunning(false);
        }
      }, 600);
    };

    const off = store.on('change', request);
    request();
    return () => {
      cancelled = true;
      off();
      clearTimeout(timeout);
    };
  }, [store]);

  const checks = report ? [...report.checks].sort((a, b) => ORDER[a.status] - ORDER[b.status]) : [];
  const fixable = checks.filter((c) => c.fix);
  const blocking = checks.filter((c) => c.status === 'fail').length;

  return (
    <div
      style={{
        // Fixed width starves the canvas when the editor is embedded in a page
        // rather than run full-screen: at 872px the workspace drops to a 22%
        // zoom and the design becomes a stamp.
        width: 'clamp(240px, 28%, 360px)',
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--pn-border, #e6e6e6)',
        background: 'var(--pn-background, #fff)',
      }}
    >
      <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--pn-border, #e6e6e6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Pre-press check</span>
          {running && <Spinner size={14} />}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.6 }}>
          {PRODUCT.name} · {PRODUCT.widthMm} × {PRODUCT.heightMm} mm ·{' '}
          {PRODUCT.bleedMm} mm bleed · {PRODUCT.minImageDpi} DPI
        </p>
        {report && (
          <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.45 }}>
            {report.summary}
          </p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {checks.map((check) => (
          <CheckRow key={check.id} check={check} store={store} />
        ))}
      </div>

      <div
        style={{
          padding: 12,
          borderTop: '1px solid var(--pn-border, #e6e6e6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          disabled={!fixable.length}
          onClick={() => fixable.forEach((c) => c.fix())}
        >
          {fixable.length
            ? `Fix ${fixable.length} automatically`
            : 'Nothing left to fix automatically'}
        </Button>
        <Button
          size="sm"
          disabled={blocking > 0}
          onClick={() =>
            store.saveAsPDF({
              fileName: 'postcard-print-ready.pdf',
              includeBleed: true,
              cropMarkSize: 24,
              dpi: PRODUCT.dpi,
            })
          }
        >
          {blocking > 0
            ? `${blocking} problem${blocking === 1 ? '' : 's'} to clear first`
            : 'Export print-ready PDF'}
        </Button>
      </div>
    </div>
  );
});
