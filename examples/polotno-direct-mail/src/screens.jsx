import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Switch } from 'polotno/primitives';
import { app } from './state.js';
import { FORMATS, FORMAT_IDS } from './spec.js';
import { deriveFields, addressProblem, money, parseGift } from './campaign.js';
import { SAMPLE_DONORS, parseCSV, toCSV } from './donors.js';
import { Icons, Label, SegmentTag, Issue, Token, plainButton, downloadBlob } from './ui.jsx';

// --- 1. format -----------------------------------------------------------

function FormatSketch({ format }) {
  // The piece's proportions with its USPS zones drawn in, at a common scale.
  const scale = 22;
  return (
    <svg width={format.widthIn * scale} height={format.heightIn * scale} viewBox={`0 0 ${format.widthIn} ${format.heightIn}`} style={{ display: 'block', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }}>
      {format.zones.map((z) => (
        <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h} fill="rgba(217,105,43,0.12)" stroke="#D9692B" strokeWidth="0.04" strokeDasharray="0.12 0.08" />
      ))}
    </svg>
  );
}

export function FormatPicker({ onChoose }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f4f4f4' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px' }}>
        <Label>Larkspur Valley Food Bank · Year-end appeal</Label>
        <h1 style={{ fontSize: 28, fontWeight: 400, margin: '10px 0 0' }}>Pick a format</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 28 }}>
          {FORMAT_IDS.map((id) => {
            const f = FORMATS[id];
            return (
              <button
                key={id}
                onClick={() => onChoose(id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  padding: 20,
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  cursor: 'pointer',
                }}
              >
                <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', background: '#f4f4f4' }}>
                  <FormatSketch format={f} />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: '#161616' }}>{f.name}</div>
                  <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>{f.size}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- 3. donors -----------------------------------------------------------

const th = { textAlign: 'left', fontWeight: 600, fontSize: 12, padding: '10px 12px', borderBottom: '1px solid #c6c6c6', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#fff' };
const td = { fontSize: 13, padding: '9px 12px', borderBottom: '1px solid #e0e0e0', verticalAlign: 'top' };

export const DonorTable = observer(({ onOpen, onNext }) => {
  const fileRef = React.useRef(null);
  const [error, setError] = React.useState('');

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file.text().then((text) => {
      const { donors } = parseCSV(text);
      if (!donors.length) {
        setError('No rows found. The first line should be a header row.');
        return;
      }
      setError('');
      app.donors = donors.slice(0, 500);
      app.listName = file.name;
      app.donorIndex = 0;
    });
  };

  const rows = app.donors.map((d) => ({ d, ...deriveFields(d, app.campaign), problem: addressProblem(d) }));
  const mailable = rows.filter((r) => !r.problem).length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f4f4' }}>
      <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px' }}>
          <Label>{app.listName}</Label>
          <h1 style={{ fontSize: 24, fontWeight: 400, margin: '8px 0 6px' }}>
            {app.donors.length} donors, {mailable} mailable
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.5, maxWidth: 680 }}>
            Upload your own CSV with first_name, last_name, address_1, city, state, zip and last_gift columns, or{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                downloadBlob(new Blob([toCSV(SAMPLE_DONORS)], { type: 'text/csv' }), 'larkspur-sample-donors.csv');
              }}
              style={{ color: 'var(--foreground)' }}
            >
              download a sample
            </a>{' '}
            to see the format. The grey columns are worked out for each donor.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {app.listName !== 'Sample list' && (
            <button style={plainButton()} onClick={() => { app.donors = SAMPLE_DONORS; app.listName = 'Sample list'; app.donorIndex = 0; }}>
              Back to sample
            </button>
          )}
          <button style={plainButton()} onClick={() => fileRef.current?.click()}>
            <Icons.upload /> Upload CSV
          </button>
          <button style={plainButton({ background: 'var(--primary)', color: 'var(--primary-foreground)', borderColor: 'var(--primary)' })} onClick={onNext}>
            Next: Fields
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
        </div>
      </div>
      {error && <div style={{ margin: '0 24px 12px', color: '#da1e28', fontSize: 13 }}>{error}</div>}
      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', margin: '0 24px 24px', background: '#fff', border: '1px solid #e0e0e0' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={th}>Donor ID</th>
              <th style={th}>Name</th>
              <th style={th}>Address</th>
              <th style={th}>Last gift</th>
              <th style={th}>Group</th>
              <th style={{ ...th, background: '#f4f4f4' }}>Greeting</th>
              <th style={{ ...th, background: '#f4f4f4' }}>Gift amounts</th>
              <th style={{ ...th, background: '#f4f4f4' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ d, values, segment, asks, problem }, i) => (
              <tr key={`${d.donor_id}-${i}`} onClick={() => onOpen(i)} style={{ cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f8f8')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                <td style={{ ...td, fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, whiteSpace: 'nowrap' }}>{d.donor_id}</td>
                <td style={td}>{values.full_name || <em style={{ color: '#a8a8a8' }}>none</em>}</td>
                <td style={{ ...td, color: '#393939' }}>
                  {[d.address_1, d.address_2].filter(Boolean).join(', ') || <em style={{ color: '#da1e28' }}>no street address</em>}
                  <div style={{ color: 'var(--muted-foreground)' }}>{values.city_state_zip}</div>
                </td>
                <td style={td}>{money(parseGift(d.last_gift)) || '–'}</td>
                <td style={td}><SegmentTag segment={segment} /></td>
                <td style={{ ...td, background: '#fafafa' }}>{values.greeting}</td>
                <td style={{ ...td, background: '#fafafa', whiteSpace: 'nowrap' }}>{asks.map(money).join(' · ')}</td>
                <td style={{ ...td, background: '#fafafa', whiteSpace: 'nowrap' }}>
                  {problem ? <Issue level="error">Can't mail</Issue> : <Issue level="ok">Ready</Issue>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// --- 4. proof ------------------------------------------------------------

export const DonorNav = observer(({ current }) => {
  const n = app.donors.length;
  const go = (d) => (app.donorIndex = (app.donorIndex + d + n) % n);
  const name = current?.values.full_name || app.donor.donor_id;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <button style={plainButton({ width: 34, padding: 0, justifyContent: 'center' })} onClick={() => go(-1)} aria-label="Previous donor">
        <Icons.left />
      </button>
      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
        {app.donorIndex + 1} / {n}
      </div>
      <button style={plainButton({ width: 34, padding: 0, justifyContent: 'center' })} onClick={() => go(1)} aria-label="Next donor">
        <Icons.right />
      </button>
      <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      {current && <SegmentTag segment={current.segment} />}
    </div>
  );
});

const Section = ({ title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', borderBottom: '1px solid #e0e0e0' }}>
    <Label>{title}</Label>
    {children}
  </div>
);

export const ProofPanel = observer(({ current, report, exporting, progress, onExport }) => {
  if (!report) {
    return <aside style={asideStyle}><div style={{ padding: 18, fontSize: 13, color: 'var(--muted-foreground)' }}>Merging the list…</div></aside>;
  }
  const row = report.rows[app.donorIndex];
  const flagged = report.rows.filter((r) => r.issues.some((x) => x.level !== 'note'));
  const pieces = report.mailable;
  const format = FORMATS[app.formatId];
  return (
    <aside style={asideStyle}>
      <Section title="This donor">
        {current && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 13 }}>
            <span style={{ color: 'var(--muted-foreground)' }}>Last gift</span>
            <span>{money(parseGift(row.donor.last_gift)) || 'None on file'}</span>
            <span style={{ color: 'var(--muted-foreground)' }}>Gift amounts</span>
            <span>{current.asks.map(money).join(' · ')}</span>
            <span style={{ color: 'var(--muted-foreground)' }}>Greeting</span>
            <span>{current.values.greeting}</span>
          </div>
        )}
        {row.issues.length ? row.issues.map((x, i) => <Issue key={i} level={x.level}>{x.text}</Issue>) : <Issue level="ok">Merged with no adjustments</Issue>}
      </Section>

      <Section title="Whole list">
        <Issue level={report.conflicts.length ? 'error' : 'ok'}>
          {report.conflicts.length
            ? `${report.conflicts.length} element${report.conflicts.length > 1 ? 's' : ''} in a USPS zone. Fix in Design.`
            : 'USPS zones clear'}
        </Issue>
        <Issue level={report.unfilled.length ? 'error' : 'ok'}>
          {report.unfilled.length ? <>No column for {report.unfilled.map((k) => <Token key={k}>{k}</Token>)}</> : 'Every field filled'}
        </Issue>
        <Issue level={report.unmailable ? 'error' : 'ok'}>
          {report.unmailable ? `${report.unmailable} can't be mailed (incomplete address), left out of the export` : 'Every address complete'}
        </Issue>
        {report.shrunk > 0 && <Issue level="note">{plural(report.shrunk, 'piece')} had text shrunk to fit a long value</Issue>}
        {report.tooLong > 0 && <Issue level="warn">{plural(report.tooLong, 'piece')} still overflow at the minimum type size</Issue>}
        {report.fallbacks > 0 && <Issue level="note">{report.fallbacks === 1 ? '1 donor has' : `${report.fallbacks} donors have`} no first name and get "Dear Friend," </Issue>}
        {flagged.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
            {flagged.map((r) => (
              <button
                key={r.index}
                onClick={() => (app.donorIndex = r.index)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '6px 8px',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  textAlign: 'left',
                  border: 'none',
                  borderTop: '1px solid #f0f0f0',
                  background: r.index === app.donorIndex ? '#e8e8e8' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[r.donor.first_name, r.donor.last_name].filter(Boolean).join(' ') || r.donor.donor_id}
                </span>
                <span style={{ color: r.mailable ? '#b28600' : '#da1e28', whiteSpace: 'nowrap' }}>{r.mailable ? 'check' : "can't mail"}</span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Export">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Show USPS zones on proof</span>
          <Switch checked={app.showZones} onCheckedChange={(v) => (app.showZones = v)} />
        </div>
        <Button onClick={onExport} disabled={exporting || !pieces || report.conflicts.length > 0} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Icons.download />
          {exporting ? `Rendering… ${Math.round(progress * 100)}%` : `Export PDF · ${pieces} pieces, ${pieces * format.pageNames.length} pages`}
        </Button>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
          One print-ready PDF in list order{format.bleedIn ? ', with bleed' : ''}. Zones and guides are left out. This renders in your browser, which
          suits a proof run; a full mailing sends the same template and list to Polotno's server-side renderer instead.
        </p>
      </Section>
    </aside>
  );
});

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const asideStyle = {
  flex: '0 0 340px',
  width: 340,
  overflowY: 'auto',
  borderLeft: '1px solid var(--border)',
  background: 'var(--background)',
};
