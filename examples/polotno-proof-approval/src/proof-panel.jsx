import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Textarea } from 'polotno/primitives';

import { app, latest, sendProof, openCustomer, openDesigner, addComment, decide } from './proof.js';

const STATUS = {
  waiting: { label: 'Waiting for review', bg: '#fdf3e0', fg: '#8a5b00' },
  approved: { label: 'Approved', bg: '#e6f4ea', fg: '#1e7e34' },
  changes: { label: 'Changes requested', bg: '#fdeaea', fg: '#a32d2d' },
};

const panel = {
  width: 300,
  flexShrink: 0,
  borderLeft: '1px solid var(--border, #e0e0e0)',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  overflowY: 'auto',
  fontSize: 14,
};
const muted = { color: 'var(--muted-foreground, #6f6f6f)', fontSize: 13, lineHeight: 1.45, margin: 0 };
const row = { display: 'flex', gap: 8 };
const time = (d) => (d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

const Chip = ({ status }) => {
  const s = STATUS[status];
  return (
    <span style={{ alignSelf: 'flex-start', background: s.bg, color: s.fg, padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 3 }}>
      {s.label}
    </span>
  );
};

const Comments = ({ version, store }) =>
  version.comments.length === 0 ? (
    <p style={muted}>No comments.</p>
  ) : (
    <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {version.comments.map((c) => (
        <li
          key={c.id}
          style={{ cursor: 'pointer' }}
          onClick={() => store.getElementById(c.elementId) && store.selectElements([c.elementId])}
        >
          <span style={{ fontWeight: 600 }}>{c.label}</span>: {c.text}
        </li>
      ))}
    </ol>
  );

const CustomerView = observer(({ store }) => {
  const [text, setText] = React.useState('');
  const v = latest();
  const selected = store.selectedElements[0];
  const open = v.status === 'waiting';
  return (
    <>
      <p style={muted}>
        You are the customer reviewing proof v{v.n}. Click an element on the card, write a comment, then approve or ask
        for changes.
      </p>
      <Chip status={v.status} />
      {open && (
        <>
          <Textarea
            value={text}
            placeholder={selected ? `Comment on "${selected.name || selected.type}"` : 'Select an element first'}
            disabled={!selected}
            onChange={(e) => setText(e.target.value)}
          />
          <Button variant="outline" disabled={!selected || !text.trim()} onClick={() => addComment(store, text) && setText('')}>
            Add comment
          </Button>
        </>
      )}
      <Comments version={v} store={store} />
      {open && (
        <div style={row}>
          <Button onClick={() => decide('approved')}>Approve</Button>
          <Button variant="outline" disabled={v.comments.length === 0} onClick={() => decide('changes')}>
            Request changes
          </Button>
        </div>
      )}
      {!open && <p style={muted}>Decision recorded at {time(v.decidedAt)}. Switch to the designer to continue.</p>}
    </>
  );
});

const DesignerView = observer(({ store }) => {
  const v = latest();
  return (
    <>
      <p style={muted}>
        You are the designer. Edit the card, then send it as a proof. Every proof is kept as its own version.
      </p>
      {v && v.comments.length > 0 && (
        <>
          <div style={{ fontWeight: 600 }}>Comments on v{v.n}</div>
          <Comments version={v} store={store} />
        </>
      )}
      <Button onClick={() => sendProof(store)} disabled={v?.status === 'waiting'}>
        Send proof v{(v?.n || 0) + 1}
      </Button>
      {v?.status === 'waiting' && <p style={muted}>v{v.n} is waiting for the customer.</p>}
    </>
  );
});

export const ProofPanel = observer(({ store }) => (
  <div style={panel}>
    <div style={{ fontWeight: 600, fontSize: 16 }}>Proof and approval</div>
    <div style={row}>
      <Button variant={app.view === 'designer' ? 'default' : 'outline'} onClick={() => openDesigner(store)}>
        Designer
      </Button>
      <Button
        variant={app.view === 'customer' ? 'default' : 'outline'}
        disabled={!latest()}
        onClick={() => openCustomer(store)}
      >
        Customer
      </Button>
    </div>
    {app.view === 'customer' && latest() ? <CustomerView store={store} /> : <DesignerView store={store} />}
    {app.versions.length > 0 && (
      <>
        <div style={{ fontWeight: 600 }}>Versions</div>
        {[...app.versions].reverse().map((v) => (
          <div key={v.n} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <img src={v.thumb} alt={`Proof v${v.n}`} style={{ width: 72, border: '1px solid #e0e0e0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>
                v{v.n} · sent {time(v.sentAt)}
              </span>
              <Chip status={v.status} />
            </div>
          </div>
        ))}
      </>
    )}
  </div>
));
