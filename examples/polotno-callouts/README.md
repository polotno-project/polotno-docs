# Callouts in Polotno

Reusable callouts (speech balloons): insert one from the side panel, edit its
text, point its tail anywhere, and change the fill, the border and the shape.

This example has no page in the documentation. It is standalone: this file
holds the ideas, the source holds the details.

## Links

- [Open Demo](http://polotno.com/docs/examples/polotno-callouts/index.html)
- [Edit in CodeSandbox](https://codesandbox.io/embed/github/polotno-project/polotno-docs/tree/main/examples/polotno-callouts?fontsize=14&hidenavigation=1&theme=dark&view=preview)

## Before you write any code

Polotno already draws a balloon: a `figure` element with
`subType: 'speechBubble'`, already in the **Elements** tab, with fill, border,
dash, corner radius, animations and every export path.

```js
page.addElement({ type: 'figure', subType: 'speechBubble', width: 300, height: 200 });
```

What it has not is a tail you can point. If a tail in the middle of the bottom
edge is enough, stop here.

## Two ways to get a movable tail

The demo builds the same callout in two ways. The toggle in the **Callouts**
panel selects the way, so you can compare them on one canvas.

|                         | Built-in elements                         | Custom element                                                                                        |
| ----------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| What the balloon is     | an `svg` element, drawn again at run time | a new element type, `callout`                                                                         |
| Where the settings live | `group.custom.callout`                    | attributes of the element                                                                             |
| Handle on the canvas    | no, the toolbar points the tail           | yes, drag the blue dot                                                                                |
| Export                  | every path works                          | the browser exports it; the Cloud Render API, `polotno-node` and the vector exporters need an adapter |

**Use the built-in way if you can.** Use a custom element when you need
controls on the canvas itself.

### Way 1: built-in elements

A `group` of an `svg` element and a `text` element. The settings live in
`custom`, the only place Polotno keeps your own data on an element. A MobX
reaction turns them into a new `src`:

```js
autorun(() => {
  // ...for every callout group:
  const src = calloutToSVG({
    ...settings,
    width: shape.width,
    height: shape.height,
  });
  untracked(() => {
    if (src === shape.src) return;
    // `history.ignore` keeps the correction out of the undo steps
    store.history.ignore(() => shape.set({ src }));
  });
});
```

### Way 2: a custom `callout` element

`unstable_registerShapeModel` + `unstable_registerShapeComponent` +
`unstable_registerTransformerAttrs` add the type. The value is the handle: a
Konva shape inside the element, so the tail follows the mouse.

```jsx
<Circle
  x={tip[0]}
  y={tip[1]}
  radius={7}
  draggable
  hideInExport
  // the editor moves the whole selection on a drag that reaches the stage
  onDragMove={(e) => {
    e.cancelBubble = true;
    element.set({
      tipX: e.target.x() / element.width,
      tipY: e.target.y() / element.height,
    });
  }}
/>
```

### The controls in the toolbar

A callout is a `group`, so the controls are extra items of the group toolbar.
A key of `components` that starts with a type name is added to that type:

```jsx
<Toolbar store={store} components={{ GroupCalloutFill, GroupCalloutSettings }} />
```

Each item returns `null` when the selection is not a callout.
`registerToolbarComponent('group', ...)` would **replace** the group toolbar,
and the built-in controls would disappear.

## Two traps

- **The box holds the balloon and the tail.** Keep a margin around the body for
  the tail: the tail then points anywhere without a change of the box, and the
  text never moves when the tail moves.
- **Never write the box of the text while the user resizes it.** The
  transformer works from the size of the element, so a write in the middle of a
  drag makes the font size run away. See `isUserDragging` in
  `src/shared/text-box.js`.

## Files

```
src/shared/                          geometry, SVG, presets, text rule, controls
src/builtin/callout.js               way 1
src/custom-element/callout-element.jsx   way 2
src/index.jsx, callouts-panel.jsx, callout-toolbar.jsx   the app, both ways
```

To take one way into your app, copy `src/shared/` and that one folder. Each way
is one block in the three root files.

## Run

```bash
npm install
npm run dev
```
