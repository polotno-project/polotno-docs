# Print preflight

A pre-press check running live against the editor, in a panel on the right.

The postcard it opens with looks finished and is not printable. Fifteen checks
run on every change and report `pass` / `warn` / `fail` / `note` / `unknown`,
each row selects the offending element on the canvas, and most carry a fix
button that repairs the design in place. Clear the blocking problems and the
export button unlocks — CMYK-ready PDF with bleed and crop marks.

## What it checks

Document: trim size against the product spec, working resolution, bleed.

Elements: image resolution at placed size, font availability, minimum type
size, safe-area margins, artwork past the trim, unfilled merge fields, text
contrast, out-of-gamut colour, large flat blacks, hairline rules, transparency,
and elements excluded from export.

Every rule the report publishes lives in `src/spec.js` as a product record — in a real
integration that comes from your catalogue, so the rules change per SKU without
touching the check code. It also carries the layout margin, which is separate
from the printer's safe area on purpose: 4 mm is what the printer enforces,
7.8 mm is where this card's grid sits, and the safe-area fix puts type back on
the grid rather than dropping it at the legal minimum.

Fonts work the same way. `getFontsList()` returns five Google fonts out of the
box, so `index.jsx` declares the brand's faces with `setGoogleFonts` — which is
both what a real integration does and what makes "font not available" a true
finding instead of a guess. The wordmark asks for a licensed desktop font that
was never packaged, and the report says so.

## What it reads

No separate document model and no server round-trip. Checks read the design the
store already holds, plus three helpers the SDK exports:

| Helper | Used for |
| --- | --- |
| `getImageSize` (`polotno/utils/image`) | true pixel dimensions behind an image |
| `getClientRect` (`polotno/utils/math`) | rotation-aware bounding boxes |
| `getFontsList` (`polotno/utils/fonts`) | which fonts can actually be loaded |

Everything else is a field read: `page.bleed`, `store.dpi`, `element.fontSize`,
`element.fill`, `element.opacity`, `element.visible`.

## Two rules worth keeping

**Never fail on a guess.** Contrast is measured only where the backdrop is a
solid colour — text over a photograph is reported as undetermined rather than
scored against a colour nobody is looking at. `unknown` is a distinct status
from `note` for the same reason: one is a gap in the report, the other is a
finding, and collapsing them misleads in opposite directions.

**Do not ship a check that cannot fire.** There is no text-overflow check here,
because Polotno grows a text box to fit its content — the state is unreachable.
A dead check reads as coverage.

## Files

- `src/spec.js` — the product and its thresholds
- `src/artwork.js` — the deliberately broken postcard
- `src/checks.js` — the rules, as data, and the engine that runs them
- `src/preflight-panel.jsx` — the right-hand rail

The panel sits on the right because `PolotnoContainer` is a flex row: anything
rendered after `<WorkspaceWrap>` lands there. No overrides needed.

## Links

- [Open Demo](http://polotno.com/docs/examples/polotno-preflight/index.html)
- [Edit in CodeSandbox](https://codesandbox.io/embed/github/polotno-project/polotno-docs/tree/main/examples/polotno-preflight?fontsize=14&hidenavigation=1&theme=dark&view=preview)
