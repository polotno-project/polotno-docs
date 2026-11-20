import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Input } from 'polotno/primitives';

import { email, sliceUploads } from './email.js';
import { T } from './ui.js';

// "Send test email": an address, the bot check, Send. The endpoint lives on
// polotno.com (app/api/demo/email-test) and caps sends per IP and per day; a
// real app sends the HTML with its own email service.
const API = '/api/demo/email-test';

const post = async (path, body) => {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { reason: data.reason });
  return data;
};

// Cloudflare Turnstile, loaded only when the server asks for it.
function useTurnstile(siteKey) {
  const ref = React.useRef(null);
  const [token, setToken] = React.useState('');
  const [failed, setFailed] = React.useState('');
  React.useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id;
    const render = () => {
      id = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (t) => {
          setFailed('');
          setToken(t);
        },
        'expired-callback': () => setToken(''),
        // 110200: the widget does not allow this hostname (a preview domain).
        'error-callback': (code) => {
          setFailed(String(code).startsWith('1102') ? 'The bot check does not run on this domain. Try it on polotno.com.' : 'The bot check failed to load. Reload the page and try again.');
          return true;
        },
      });
    };
    if (window.turnstile) render();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }
    return () => id !== undefined && window.turnstile?.remove(id);
  }, [siteKey]);
  const reset = () => {
    setToken('');
    window.turnstile?.reset(ref.current);
  };
  return { ref, token, reset, failed };
}

const S = {
  bar: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: 12, border: `1px solid ${T.border}`, borderRadius: T.radius },
  note: { margin: 0, fontSize: 13, color: T.mutedForeground },
  error: { margin: 0, fontSize: 13, color: T.destructive },
};

export const SendPanel = observer(() => {
  const [config, setConfig] = React.useState(null); // null = loading, false = unavailable
  const [address, setAddress] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sentTo, setSentTo] = React.useState('');
  const turnstile = useTurnstile(config?.turnstileSiteKey);

  React.useEffect(() => {
    fetch(API)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((c) => setConfig(c.enabled ? c : false))
      .catch(() => setConfig(false));
  }, []);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const images = await sliceUploads();
      const res = await post('/send', { email: address, turnstileToken: turnstile.token, html: email.html, images });
      setSentTo(res.to);
    } catch (e) {
      setError(e.message);
    } finally {
      // A Turnstile token works once: get a fresh one for the next send.
      turnstile.reset();
      setBusy(false);
    }
  };

  if (config === null) return <div style={S.bar}><p style={S.note}>Checking…</p></div>;
  if (config === false) {
    return (
      <div style={S.bar}>
        <p style={S.note}>Sending a test email works on polotno.com. In your app, send the HTML with your own email service.</p>
      </div>
    );
  }

  return (
    <div style={S.bar}>
      <Input
        type="email"
        placeholder="you@company.com"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !busy && send()}
        style={{ width: 240 }}
      />
      <Button onClick={send} disabled={busy || !address.includes('@') || !email.html || (config.turnstileSiteKey && !turnstile.token)}>
        {busy ? 'Sending…' : sentTo ? 'Send again' : 'Send'}
      </Button>
      {/* The bot check sits after the button, so address and Send stay together. */}
      <div ref={turnstile.ref} style={{ marginLeft: 'auto' }} />
      <div style={{ flexBasis: '100%' }}>
        {sentTo && !error && <p style={{ ...S.note, color: '#16a34a' }}>Sent to {sentTo}. Check your inbox (and spam).</p>}
        {!sentTo && !error && <p style={S.note}>The email in the preview, for the recipient you chose. Up to 3 an hour.</p>}
        {error && <p style={S.error}>{error}</p>}
        {turnstile.failed && <p style={S.error}>{turnstile.failed}</p>}
      </div>
    </div>
  );
});
