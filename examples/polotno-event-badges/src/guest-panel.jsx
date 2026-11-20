import React from 'react';
import { getVariables, resolveVariables } from '@polotno/schema/variables';
import { jsonToImageBlob } from '@polotno/image-export';
import { Button, buttonVariants, Input, Spinner, Switch, Textarea } from 'polotno/primitives';
import { KEY } from './template.js';
import { GUESTS } from './guests.js';

const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const ERROR = '#dc2626';
const muted = { fontSize: 12, color: MUTED };

// The template's fields, read again after every edit (undo included), so a
// variable added or renamed in the Variables panel changes the columns.
function useFields(store) {
  const [fields, setFields] = React.useState(() => getVariables(store.toJSON()).variables);
  React.useEffect(
    () => store.on('change', (json) => setFields(getVariables(json).variables)),
    [store]
  );
  return fields;
}

// A dotted name reads nested data: `user.city` is `record.user.city`.
function setPath(record, name, value) {
  const keys = name.split('.');
  const last = keys.pop();
  let node = record;
  for (const key of keys) {
    if (typeof node[key] !== 'object') node[key] = {};
    node = node[key];
  }
  node[last] = value;
}

// The record your app would send for one row: a value for each field of the
// template. An empty cell is left out, so the badge falls back to the field's
// default, then to the token or the template's own photo and colour.
function toRecord(row, fields) {
  const record = {};
  for (const { name } of fields) {
    const value = row[name];
    if (value !== undefined && value !== '') setPath(record, name, value);
  }
  return record;
}

// Pasted rows: tab-separated (copied from a spreadsheet) or comma-separated.
// A first line of variable names maps the columns; without one, the cells
// follow the table's column order. Quoted cells with commas are not handled.
function parseRows(text, fields) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const separator = lines.some((line) => line.includes('\t')) ? '\t' : ',';
  const cells = lines.map((line) =>
    line.split(separator).map((cell) => cell.trim().replace(/^"(.*)"$/, '$1'))
  );
  const names = fields.map((f) => f.name);
  const header = cells[0]?.every((cell) => names.includes(cell)) ? cells.shift() : names;
  return cells.map((line) =>
    Object.fromEntries(
      header.map((name, i) => {
        const value = line[i] ?? '';
        const field = fields.find((f) => f.name === name);
        return [name, field?.type === 'boolean' ? /^(true|yes|y|1|x)$/i.test(value) : value];
      })
    )
  );
}

const PhotoCell = ({ value, onChange }) => {
  const pick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };
  const size = { width: 28, height: 28, borderRadius: '50%', display: 'block' };
  return (
    <label title="Upload a photo" style={{ cursor: 'pointer', display: 'inline-block' }}>
      {value ? (
        <img src={value} alt="" style={{ ...size, objectFit: 'cover', objectPosition: '50% 30%' }} />
      ) : (
        <span style={{ ...size, boxSizing: 'border-box', border: `1px dashed ${MUTED}` }} />
      )}
      <input type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
    </label>
  );
};

const ColorCell = ({ value, onChange }) => (
  <span title={value || 'No colour: the template keeps its own'} style={{ position: 'relative', display: 'inline-block' }}>
    <span
      style={{
        display: 'block',
        width: 24,
        height: 24,
        borderRadius: 6,
        boxSizing: 'border-box',
        background: value || 'transparent',
        border: value ? '1px solid rgba(0, 0, 0, 0.1)' : `1px dashed ${MUTED}`,
      }}
    />
    <input
      type="color"
      value={/^#[0-9a-f]{6}$/i.test(value ?? '') ? value : '#000000'}
      onChange={(e) => onChange(e.target.value)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
    />
  </span>
);

const Cell = ({ field, value, onChange }) => {
  if (field.type === 'boolean') {
    return <Switch checked={value === true} onCheckedChange={(checked) => onChange(checked)} />;
  }
  if (field.type === 'color') return <ColorCell value={value} onChange={onChange} />;
  if (field.type === 'image') return <PhotoCell value={value} onChange={onChange} />;
  return (
    <Input
      value={value ?? ''}
      placeholder={typeof field.default === 'string' ? field.default : field.required ? 'required' : ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ height: 28, fontSize: 12, padding: '0 6px', minWidth: 0 }}
    />
  );
};

// Fixed widths for the compact cells; text columns share the rest.
const COLUMN_WIDTH = { image: 40, color: 46, boolean: 44 };

const BadgeCard = ({ result, index }) => {
  const failed = result.error || result.issues.some((issue) => issue.severity === 'error');
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 6,
        borderRadius: 8,
        border: `1px solid ${failed ? ERROR : BORDER}`,
      }}
    >
      {result.url ? (
        <a href={result.url} target="_blank" rel="noreferrer" title="Open full size">
          <img
            src={result.url}
            alt={`Badge: ${result.caption}`}
            style={{ display: 'block', width: '100%', aspectRatio: '2 / 3', objectFit: 'contain' }}
          />
        </a>
      ) : (
        <div style={{ aspectRatio: '2 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center', ...muted }}>
          {result.error ? 'Render failed' : <Spinner />}
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {result.caption}
      </div>
      {result.issues.map((issue, i) => (
        <div
          key={i}
          style={{ fontSize: 11, color: issue.severity === 'error' ? ERROR : MUTED }}
        >
          {issue.reason}: {issue.variable ?? issue.key}
        </div>
      ))}
      {result.error && <div style={{ fontSize: 11, color: ERROR }}>{result.error}</div>}
      {result.url && (
        <a
          href={result.url}
          download={`badge-${index + 1}.png`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          style={{ height: 26, fontSize: 12, color: 'inherit', textDecoration: 'none' }}
        >
          Download
        </a>
      )}
    </div>
  );
};

export const GuestPanel = ({ store }) => {
  const fields = useFields(store);
  const [rows, setRows] = React.useState(GUESTS);
  const [pasting, setPasting] = React.useState(false);
  const [csv, setCsv] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [busy, setBusy] = React.useState(false);

  const update = (index, name, value) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, [name]: value } : row)));

  const addPasted = () => {
    setRows([...rows, ...parseRows(csv, fields)]);
    setCsv('');
    setPasting(false);
  };

  const generate = async () => {
    setBusy(true);
    const template = store.toJSON();
    const { variables } = getVariables(template);
    results.forEach((result) => result.url && URL.revokeObjectURL(result.url));
    const next = rows.map((row, i) => ({ caption: row.name || `Row ${i + 1}`, issues: [] }));
    setResults([...next]);
    for (const [i, row] of rows.entries()) {
      // One template, one record per badge. On a server, the same call fills
      // each copy of a batch before polotno-node renders it.
      const { design, issues } = resolveVariables(template, toRecord(row, variables));
      try {
        const blob = await jsonToImageBlob(design, { key: KEY, pixelRatio: 2 });
        next[i] = { ...next[i], issues, url: URL.createObjectURL(blob) };
      } catch (e) {
        console.error(e);
        next[i] = { ...next[i], issues, error: e.message };
      }
      setResults([...next]);
    }
    setBusy(false);
  };

  const th = { ...muted, fontWeight: 500, textAlign: 'left', padding: '4px 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const td = { padding: '3px 2px', verticalAlign: 'middle' };
  const sample = fields.map((f) => (f.type === 'image' ? '' : String(f.value ?? ''))).join(',');

  return (
    <div
      style={{
        width: 'clamp(380px, 40vw, 540px)',
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `1px solid ${BORDER}`,
      }}
    >
      <div style={{ padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Guest list</div>
          <Button variant="outline" size="sm" onClick={() => setPasting(!pasting)}>
            Paste CSV
          </Button>
          <Button size="sm" onClick={generate} disabled={busy || !rows.length}>
            {busy && <Spinner />}
            Generate badges
          </Button>
        </div>
        <div style={muted}>
          The columns are the template's variables. An empty cell falls back to the variable's
          default, then to the template.
        </div>
      </div>

      {pasting && (
        <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={`${fields.map((f) => f.name).join(',')}\n${sample}`}
            rows={4}
            style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace' }}
          />
          <div style={muted}>
            One guest per line, from a spreadsheet or a CSV file. Start with a line of variable
            names, or follow the table's column order.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <Button variant="ghost" size="sm" onClick={() => setPasting(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={addPasted} disabled={!csv.trim()}>
              Add rows
            </Button>
          </div>
        </div>
      )}

      <div style={{ padding: '0 9px 8px', overflowY: 'auto', flexShrink: 0, maxHeight: '45%' }}>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {fields.map((f) => (
                <th key={f.name} title={f.description} style={{ ...th, width: COLUMN_WIDTH[f.type] }}>
                  {(f.label ?? f.name) + (f.required ? ' *' : '')}
                </th>
              ))}
              <th style={{ ...th, width: 28 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {fields.map((f) => (
                  <td key={f.name} style={td}>
                    <Cell field={f} value={row[f.name]} onChange={(value) => update(i, f.name, value)} />
                  </td>
                ))}
                <td style={td}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove guest"
                    title="Remove guest"
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    style={{ width: 24, height: 24 }}
                  >
                    ×
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button variant="ghost" size="sm" onClick={() => setRows([...rows, {}])} style={{ marginTop: 4 }}>
          + Add guest
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', borderTop: `1px solid ${BORDER}`, padding: 12 }}>
        {results.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {results.map((result, i) => (
              <BadgeCard key={i} result={result} index={i} />
            ))}
          </div>
        ) : (
          <div style={muted}>
            Generate badges fills the template once per row and renders each badge as a PNG in your
            browser.
          </div>
        )}
      </div>
    </div>
  );
};
