import React from 'react';
import { getVariables, resolveVariables } from '@polotno/schema/variables';
import { jsonToImageBlob } from '@polotno/image-export';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldRow,
  Input,
  Switch,
} from 'polotno/primitives';

// this is a demo key just for that project
// (!) please don't use it in your projects
// to create your own API key please go here: https://polotno.com/login
const KEY = 'nFA5H9elEytDyPyvKL7T';

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

// The record your app would send: the typed values, empty fields left out.
function toRecord(values) {
  const record = {};
  for (const [name, value] of Object.entries(values)) {
    if (value !== '') setPath(record, name, value);
  }
  return record;
}

const PreviewDialog = ({ store, onClose }) => {
  // The template's fields, with their types, labels and stored values.
  const [fields] = React.useState(() => getVariables(store.toJSON()).variables);
  const [values, setValues] = React.useState(() =>
    Object.fromEntries(
      fields.map((v) => [
        v.name,
        v.type === 'boolean' ? v.value !== false : typeof v.value === 'string' ? v.value : '',
      ])
    )
  );
  const [preview, setPreview] = React.useState(null);
  const [issues, setIssues] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  // Each preview is a blob URL; free the old one when it is replaced or the
  // dialog closes.
  React.useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const render = async () => {
    setBusy(true);
    try {
      // The same call fills a batch on a server: one record per copy.
      const { design, issues } = resolveVariables(store.toJSON(), toRecord(values));
      const blob = await jsonToImageBlob(design, {
        key: KEY,
        pageId: store.activePage.id,
      });
      setPreview(URL.createObjectURL(blob));
      setIssues(issues);
    } catch (e) {
      console.error(e);
      alert('Something went wrong');
    }
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fill the template</DialogTitle>
          <DialogDescription>
            Type a record. An empty field is left out of it: the preview falls
            back to the variable's default, then to the token or the template's
            own image.
          </DialogDescription>
        </DialogHeader>
        {fields.map((v) => (
          <FieldRow
            key={v.name}
            label={(v.label ?? v.name) + (v.required ? ' *' : '')}
            title={v.description}
            style={{ gap: 8 }}
          >
            {v.type === 'boolean' ? (
              <Switch
                checked={values[v.name]}
                onCheckedChange={(checked) =>
                  setValues({ ...values, [v.name]: checked })
                }
              />
            ) : (
              <Input
                value={values[v.name]}
                placeholder={typeof v.default === 'string' ? v.default : undefined}
                onChange={(e) => setValues({ ...values, [v.name]: e.target.value })}
                style={{ width: 260 }}
              />
            )}
          </FieldRow>
        ))}
        {preview && (
          <img
            src={preview}
            alt="Filled design"
            style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }}
          />
        )}
        {issues.map((issue, i) => (
          <div key={i} style={{ color: issue.severity === 'error' ? 'crimson' : 'gray' }}>
            {issue.reason}: {issue.variable ?? issue.key}
          </div>
        ))}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={render} disabled={busy}>
            Render
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const PreviewButton = ({ store }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Preview</Button>
      {open && <PreviewDialog store={store} onClose={() => setOpen(false)} />}
    </>
  );
};
