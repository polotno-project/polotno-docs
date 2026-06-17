# Vector vs Bitmap PDF Export

Demo of two PDF export paths from a Polotno design, both running fully client-side in the browser:

- **Bitmap PDF** (default) — `store.saveAsPDF()`. Each page is rasterised into a flattened image embedded in the PDF. Identical to the canvas; larger files; fixed resolution.
- **Vector PDF** — `jsonToPDFBlob()` from `@polotno/pdf-export/browser`. Paths, strokes, and text survive as real PDF objects. Selectable text, smaller files, resolution-independent.

## Links

- [Open Demo](http://polotno.com/docs/examples/polotno-vector-pdf-export/index.html)
- [Edit in CodeSandbox](https://codesandbox.io/embed/github/polotno-project/polotno-docs/tree/main/examples/polotno-vector-pdf-export?fontsize=14&hidenavigation=1&theme=dark&view=preview)
- [PDF Export docs](https://polotno.com/docs/pdf-export)

## When to pick which

| Need | Use |
|------|-----|
| Pixel-perfect parity with the canvas | Bitmap |
| Selectable text, smaller files | Vector |
| Print shop deliverables (PDF/X-1a, spot inks) | Vector via the [Node entry](https://www.npmjs.com/package/@polotno/pdf-export) — Ghostscript required |
