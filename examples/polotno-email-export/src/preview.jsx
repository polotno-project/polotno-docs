import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, ToggleGroup, ToggleGroupItem } from 'polotno/primitives';

import { email, closePreview, downloadHTML, setRecipient } from './email.js';
import { RECIPIENTS, VARIABLES } from './recipients.js';
import { simulate, CLIENTS } from './simulate.js';
import { SendPanel } from './send.jsx';
import { Icons } from './icons.jsx';
import { T } from './ui.js';

const DEVICES = { desktop: 720, mobile: 375 };

const TOKENS = VARIABLES.map((v) => `{{${v.name}}}`).join(' and ');
const ISSUE = {
  'unknown-key': (i) => `unknown field "${i.key}"`,
  'missing-required': (i) => `missing ${i.variable}`,
  'type-mismatch': (i) => `wrong type for ${i.variable}`,
};

// What the export did with the template for the chosen recipient.
const RecipientNote = observer(() => {
  const r = RECIPIENTS.find((x) => x.id === email.recipient);
  if (!r.record) return <>{TOKENS} stay in the HTML for your email service to fill in.</>;
  const issues = email.issues.map((i) => (ISSUE[i.reason] || ((x) => x.reason))(i));
  return (
    <>
      <code>resolveVariables(template, record)</code> fills the email from the record{' '}
      <code>{JSON.stringify(r.record)}</code>.
      {issues.length > 0 && <> Reported: {issues.join(', ')}. A missing field uses the variable's default.</>}
    </>
  );
});

export const Preview = observer(() => {
  const [device, setDevice] = React.useState('desktop');
  const [client, setClient] = React.useState('apple');
  const [copied, setCopied] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const html = React.useMemo(() => simulate(email.previewHtml, client), [email.previewHtml, client]);

  const copy = async () => {
    await navigator.clipboard.writeText(email.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={email.previewOpen} onOpenChange={(open) => !open && closePreview()}>
      <DialogContent style={{ maxWidth: 'min(1100px, 96vw)', width: '96vw', height: '92vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <DialogHeader>
          <DialogTitle>Email preview</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleGroup variant="outline" value={[device]} onValueChange={(v) => v[0] && setDevice(v[0])}>
            <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem>
            <ToggleGroupItem value="mobile">Mobile</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup variant="outline" value={[client]} onValueChange={(v) => v[0] && setClient(v[0])}>
            {Object.entries(CLIENTS).map(([k, c]) => (
              <ToggleGroupItem key={k} value={k}>
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button variant={sending ? 'default' : 'outline'} onClick={() => setSending(!sending)} disabled={!email.html}>
              {Icons.send({ size: 16 })}
              Send test email
            </Button>
            <Button variant="outline" onClick={copy} disabled={!email.html}>
              {copied ? 'Copied' : 'Copy HTML'}
            </Button>
            <Button variant="outline" onClick={downloadHTML} disabled={!email.html}>
              Download .html
            </Button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.mutedForeground }}>Recipient</span>
          <ToggleGroup variant="outline" value={[email.recipient]} onValueChange={(v) => v[0] && setRecipient(v[0])}>
            {RECIPIENTS.map((r) => (
              <ToggleGroupItem key={r.id} value={r.id}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: T.mutedForeground }}>
          <RecipientNote />
        </p>
        {sending && <SendPanel />}
        <p style={{ margin: 0, fontSize: 13, color: T.mutedForeground }}>{CLIENTS[client].note}</p>
        <div style={{ flex: 1, minHeight: 0, background: T.muted, borderRadius: T.radius, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          {email.html ? (
            <iframe
              title="Email preview"
              srcDoc={html}
              sandbox="allow-same-origin"
              style={{ width: DEVICES[device], height: '100%', border: 0, background: '#fff', transition: 'width .2s' }}
            />
          ) : (
            <p style={{ alignSelf: 'center', color: T.mutedForeground }}>{email.error ? 'Export failed, see the Audit tab.' : 'Exporting…'}</p>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: T.mutedForeground }}>
          {email.images.length} image slices, {(email.stats.bytes / 1024).toFixed(1)} KB of HTML. Slices point at placeholder https URLs, as
          your <code>uploadImage</code> would return. The download embeds them as data URLs so the file opens anywhere; Gmail drops those.
        </p>
      </DialogContent>
    </Dialog>
  );
});
