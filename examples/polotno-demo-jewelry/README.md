# Jewelry designer demo

A 2D ring builder on Polotno SDK. You build a ring top-down from parts, the
way retail jewelers do in desktop CAD, and then turn the flat design into a
photo with an image-to-image model.

```bash
pnpm install
pnpm dev
```

## How it's built

- **`src/gems.js`**: eight cuts (round, oval, pear, marquise, cushion, heart,
  princess, emerald) drawn in code as faceted SVG top views, in six stone
  colours, plus pavé rows.
- **`src/metal.js`**: eight shanks and four settings (4 prongs, 6 prongs,
  bezel, halo) in white, yellow and rose gold. Settings fit any cut, because
  they're drawn from the stone's own outline.
- **`src/parts.js`**: parts as Polotno SVG elements. Each element keeps its
  recipe in `custom` (cut, stone, size in mm, metal), so a change redraws the
  part in place. Settings follow their stone and resize with it. This file
  also has the starter designs and the design-to-JSON export.
- **`src/panels.jsx`**: side panels: Designs (starter rings, JSON export),
  Metal, Stones, Settings and Render, built from `polotno/primitives`.
- **`src/toolbar.jsx`**: per-part controls added to Polotno's toolbar as
  `Svg*` components.
- **`src/render.js`**: the AI render: a JPEG of the page plus a prompt
  written from the design, sent to `/api/render`.
- **`render-proxy.js`**: the dev-time `/api/render` endpoint, a Vite plugin
  that runs the chosen model on Replicate. Production uses the same models
  through `lib/demo/jewelry-render.ts` in the website.

The canvas works in millimetres at 1200 dpi (`store.setUnit`). The workspace
is one fixed black frame with mm rulers on its edges (`src/frame.jsx`): zoom
and scroll move the design inside it, and the rulers re-count. Sizes on
the rulers and in the toolbar are real stone and band sizes.

## Two versions

One build serves both (see `src/ai.js`):

- **Public**, at polotno.com/demo/jewelry-designer: everything works except
  Render, which explains that live AI is off and links to the contact page.
- **Private**, at polotno.com/demo/jewelry-designer/<key>: the page only
  exists when `<key>` matches `JEWELRY_DEMO_KEY`, and it opens the demo with
  `?k=<key>`. Renders then go to `/api/demo/jewelry-render`, which checks the
  key, runs the model on Replicate with `REPLICATE_API_TOKEN` and caps usage.
  Change the key on Railway to revoke a link.

Locally, `pnpm dev` renders through `render-proxy.js` with the token in
`.env.local` (gitignored).

## Notes

- Render models, all on Replicate: Nano Banana Pro (Google), GPT Image 2
  (OpenAI), Seedream 5 Pro (ByteDance) and Flux 2 Max (Black Forest Labs).
- The render prompt names the stones outright ("all stones are colourless
  white diamonds"). If you ask the model to "keep the colours", it tends to
  invent coloured side stones.
