# PDF Export Options

Demo of the PDF export paths from a Polotno design, all running fully client-side in the browser. One **Download PDF** button opens a menu of options:

- **Vector PDF** (default) — `jsonToPDFBlob()` from `@polotno/pdf-export/browser`. Paths, strokes, and text survive as real PDF objects. Selectable text, smaller files, resolution-independent.
- **Flatten pages** — `store.saveAsPDF()`. Each page is rasterised into a flattened image embedded in the PDF. Identical to the canvas; larger files; fixed resolution.
- **Print-ready (PDF/X-4)** — `pdfx: 'x-4'` with an ISO Coated v2 (FOGRA39) output intent embedded from an ICC profile.
- **CMYK colors** — `colorMode: 'cmyk'` converts fills, strokes, and gradients through the output intent.

## Links

- [Open Demo](http://polotno.com/docs/examples/polotno-vector-pdf-export/index.html)
- [Edit in CodeSandbox](https://codesandbox.io/embed/github/polotno-project/polotno-docs/tree/main/examples/polotno-vector-pdf-export?fontsize=14&hidenavigation=1&theme=dark&view=preview)
- [PDF Export docs](https://polotno.com/docs/pdf-export)

## When to pick which

| Need                                          | Use                   |
| --------------------------------------------- | --------------------- |
| Selectable text, smaller files                | Vector (default)      |
| Pixel-perfect parity with the canvas          | Flatten pages         |
| Print shop deliverables (PDF/X, CMYK)         | Print-ready (PDF/X-4) |
