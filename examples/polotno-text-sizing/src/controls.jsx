import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Input, Textarea } from 'polotno/primitives';
import { measureText } from 'polotno/utils/measure-text';

// The panel stands in for your application: it writes values into the
// template's text fields, and the fields size themselves. Each field is found
// by the custom property the template gave it.
const fieldElement = (store, name) =>
  store.activePage.children.find((el) => el.custom?.field === name);

const NAMES = ['Li An', 'Alexandra Konstantinopolsky', 'Aleksandra Konstantinopolskaya-Fernandez'];
const PRICES = ['$9', '$19', '$1,299', '$12,499.00'];

const panel = {
  width: 320,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  overflow: 'auto',
  borderRight: '1px solid #e4e7eb',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
};

const Field = ({ label, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontWeight: 600 }}>{label}</span>
    {children}
  </label>
);

const Presets = ({ values, onPick }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {values.map((value) => (
      <Button key={value} size="sm" variant="outline" onClick={() => onPick(value)}>
        {value.length > 18 ? value.slice(0, 16) + '…' : value}
      </Button>
    ))}
  </div>
);

// What the canvas draws for the headline, from the same engine the canvas
// and every exporter use. `fontSize` is the drawn size, not the authored one.
const useMeasurement = (element) => {
  const [result, setResult] = React.useState(null);
  const text = element?.text;
  const width = element?.width;
  React.useEffect(() => {
    if (!element) return;
    let alive = true;
    measureText(element.toJSON()).then((r) => alive && setResult(r));
    return () => {
      alive = false;
    };
  }, [element, text, width]);
  return result;
};

export const SizingControls = observer(({ store }) => {
  const name = fieldElement(store, 'name');
  const description = fieldElement(store, 'description');
  const price = fieldElement(store, 'price');
  const footer = fieldElement(store, 'footer');
  const measured = useMeasurement(name);

  return (
    <div style={panel}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Text sizing</h2>
        <p style={{ margin: 0, color: '#52606d' }}>
          Type any value. Each box keeps its place: the headline and the price
          fit their boxes, the description stops after two lines, the footer is
          cut with an ellipsis.
        </p>
      </div>

      <Field label="Name — textOverflow: 'fit', 24px to 160px">
        <Input value={name?.text ?? ''} onChange={(e) => name?.set({ text: e.target.value })} />
        <Presets values={NAMES} onPick={(value) => name?.set({ text: value })} />
      </Field>

      {measured && (
        <div style={{ padding: 10, background: '#f5f7fa', borderRadius: 6, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600 }}>measureText(name)</div>
          <div>authored fontSize: {name.fontSize}px</div>
          <div>drawn fontSize: {Math.round(measured.fontSize)}px</div>
          <div>lines: {measured.lineCount}</div>
          <div>truncated: {String(measured.truncated)}</div>
        </div>
      )}

      <Field label="Description — 'resize', maxLines: 2">
        <Textarea
          rows={3}
          value={description?.text ?? ''}
          onChange={(e) => description?.set({ text: e.target.value })}
        />
      </Field>

      <Field label="Price — 'fit' in a fixed box">
        <Input value={price?.text ?? ''} onChange={(e) => price?.set({ text: e.target.value })} />
        <Presets values={PRICES} onPick={(value) => price?.set({ text: value })} />
      </Field>

      <Field label="Footer — 'ellipsis'">
        <Input value={footer?.text ?? ''} onChange={(e) => footer?.set({ text: e.target.value })} />
      </Field>

      <p style={{ margin: 0, color: '#52606d' }}>
        Resize a box on the canvas: the text re-fits to the new size, and the
        authored font size never changes.
      </p>
    </div>
  );
});
