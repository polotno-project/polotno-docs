# Polotno watermark demo

A deliberately lean editor showing the two watermark placeholders people
actually ask for — a diagonal **text** watermark and a **logo image**
watermark — plus the properties that make them behave like watermarks rather
than like ordinary elements.

Both are plain elements on the design. Three properties do all the work:

| Property | Effect |
| --- | --- |
| `selectable: false` | the person editing cannot grab, drag, or delete it |
| `alwaysOnTop: true` | it stays above anything they add afterwards |
| `showInExport` | whether it lands in the downloaded file, or stays a canvas-only guide |

The side panel is cut down to a custom **Watermark** section plus Photos and
Upload. The Watermark section retexts the stamp, swaps the logo, and toggles
the two behaviours live, so the difference between a locked exported watermark
and an editor-only guide is something you can see rather than read about.

## Run it

```bash
npm install
npm run dev
```

## Where it is used

Embedded on [the watermark API page](https://polotno.com/sdk/product/features/watermark-api).
The [watermark PDF tool](https://polotno.com/tools/watermark-pdf) deliberately
does not embed it — that page already runs its own editor, and two on one page
is one too many.
