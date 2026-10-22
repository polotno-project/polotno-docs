import React from 'react';
import { SectionTab } from 'polotno/side-panel';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
} from 'polotno/primitives';

// Peecho tab: export the poster as a one-page PDF and send it, through the demo
// backend that holds the Peecho key, to Peecho's Print API test environment.
// Peecho creates the order, prices it and picks a print lab. The order is
// never paid, so it is never printed.

const API = (import.meta.env.VITE_POD_API || 'https://pod-proxy-production.up.railway.app').replace(/\/$/, '');

/** Inline styles: the published CSS only ships `pn:` utilities. */
const styles = {
  panel: { display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflowY: 'auto', paddingBottom: 24 },
  label: { fontSize: 12, fontWeight: 500, opacity: 0.75 },
  spec: { fontSize: 13, margin: 0, lineHeight: 1.5 },
  hint: { fontSize: 12, lineHeight: 1.45, opacity: 0.65, margin: 0 },
  progress: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '10px 12px', background: '#f4f4f4' },
  error: { fontSize: 13, color: '#b42318', margin: 0 },
  dialog: { maxWidth: 760, width: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' },
  verdict: { padding: '12px 14px', fontSize: 14, fontWeight: 600, background: '#e8f5e9', color: '#1b5e20' },
  facts: { display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 16, rowGap: 6, fontSize: 13, marginTop: 12 },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.5,
    margin: '6px 0 0',
    padding: 12,
    background: '#f4f4f4',
    overflowX: 'auto',
    whiteSpace: 'pre',
    maxHeight: 280,
  },
};

const euro = (cents) => (typeof cents === 'number' ? `€${(cents / 100).toFixed(2)}` : '–');
const show = (value) =>
  JSON.stringify(value, (k, v) => (typeof v === 'string' && v.length > 100 ? `${v.slice(0, 60)}…` : v), 2);

function Result({ result, onClose }) {
  const d = result.details || {};
  const price = d.order_price_data || {};
  const lab = d.fulfilment_location?.country_code;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={styles.dialog}>
        <DialogHeader>
          <DialogTitle>Back from Peecho</DialogTitle>
          <DialogDescription>
            Peecho&apos;s Print API (test environment) created this order from the PDF this editor just exported. It
            stays unpaid, so it is never printed.
          </DialogDescription>
        </DialogHeader>
        <div style={styles.verdict}>Peecho created order #{result.order?.order_id} for {result.product.name}.</div>
        <div style={styles.facts}>
          <span style={styles.label}>Status</span>
          <span>{d.order_state || '–'}</span>
          <span style={styles.label}>Print</span>
          <span>{euro(price.total_retail_product_price_ex_taxes)}</span>
          <span style={styles.label}>Shipping to Amsterdam</span>
          <span>{euro(price.total_retail_shipping_ex_taxes)}</span>
          <span style={styles.label}>Total</span>
          <span>{euro(price.total_retail_price_inc_taxes)}</span>
          <span style={styles.label}>Printed in</span>
          <span>{lab || '–'}</span>
        </div>
        {result.requests.map((r) => (
          <div key={r.endpoint} style={{ marginTop: 18 }}>
            <span style={styles.label}>{r.title}</span>
            <pre style={styles.code}>{`${r.endpoint}\n${show(r.body)}\n\n→ ${show(r.response)}`}</pre>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}

export function peechoSection(product) {
  const Panel = ({ store }) => {
    const [step, setStep] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [result, setResult] = React.useState(null);

    const send = async () => {
      setError(null);
      setStep('Exporting the print PDF…');
      try {
        store.selectElements([]);
        const pdf = await store.toPDFDataURL();
        setStep('Peecho is creating the order…');
        const res = await fetch(`${API}/peecho/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Peecho request failed');
        setResult(json);
      } catch (e) {
        console.error('peecho order failed', e);
        setError(e?.message || 'Something went wrong');
      } finally {
        setStep(null);
      }
    };

    return (
      <div style={styles.panel}>
        <div>
          <span style={styles.label}>Product</span>
          <p style={styles.spec}>
            Fine Art Print A3, {product.widthMm} × {product.heightMm} mm
          </p>
        </div>
        <Button onClick={step ? undefined : send} aria-busy={!!step}>
          {step ? 'Ordering…' : 'Order a test print'}
        </Button>
        {step && (
          <div role="status" style={styles.progress}>
            <Spinner />
            {step}
          </div>
        )}
        {error && <p style={styles.error}>{error}</p>}
        <p style={styles.hint}>
          Exports this poster as a PDF and sends it to Peecho&apos;s Print API, which prices it and picks a print lab.
          The order is created in Peecho&apos;s test environment and never printed.
        </p>
        {result && <Result result={result} onClose={() => setResult(null)} />}
      </div>
    );
  };

  return {
    name: 'peecho',
    Tab: (props) => (
      <SectionTab name="Peecho" {...props}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="2.5" width="12" height="15" stroke="currentColor" strokeWidth="1.4" />
          <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </SectionTab>
    ),
    Panel,
  };
}
