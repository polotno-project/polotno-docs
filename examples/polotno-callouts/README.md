# Callouts in Polotno

Reusable callouts (speech balloons) that you insert from the side panel, with
a text you can edit and a tail you can point in any direction.

The demo builds the same callout in **two ways**, so you can put them beside
each other on one page and compare them. The toggle in the **Callouts** panel
selects the way.

## Links

- [Open Demo](http://polotno.com/docs/examples/polotno-callouts/index.html)
- [Edit in CodeSandbox](https://codesandbox.io/embed/github/polotno-project/polotno-docs/tree/main/examples/polotno-callouts?fontsize=14&hidenavigation=1&theme=dark&view=preview)

|                         | Built-in elements                         | Custom element                                                                                                                                     |
| ----------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| What the balloon is     | an `svg` element, drawn again at run time | a new element type, `callout`                                                                                                                      |
| Code you write          | a function that makes an SVG string       | a MobX model + a react-konva component                                                                                                             |
| Where the settings live | `group.custom.callout`                    | attributes of the element                                                                                                                          |
| Handle on the canvas    | no, the toolbar points the tail           | yes, drag the blue dot                                                                                                                             |
| Export                  | every path works                          | PNG/JPEG in the browser; the Cloud Render API, `polotno-node` and the vector exporters need [extra work](https://polotno.com/docs/custom-elements) |

**Use the built-in way if you can.** It stays inside the standard element
types, so every export path and every other tool keeps working. Use the custom
element when you need controls on the canvas itself.

## Files

```
src/
  index.jsx             the editor
  callouts-panel.jsx    the "Callouts" tab, with the toggle
  callout-toolbar.jsx   the controls in the top toolbar, for both ways
  shared/               everything the two ways have in common
    callout-geometry.js   pure math: size + tail direction -> SVG paths
    callout-svg.js        the paths -> an SVG image, and the default colors
    presets.js            the three cards of the side panel
    text-box.js           the text is the body of the balloon, and stays in it
    callout-controls.jsx  fill, border, shape, tail, tail direction
    tail-pad.jsx          the small pad that points the tail
  builtin/
    callout.js            way 1: an `svg` element + a `text` element in a group
  custom-element/
    callout-element.jsx   way 2: registers the `callout` type
    add-callout.js        way 2: inserts one, keeps its text in place
```

**To take one way into your own app:** copy `src/shared/` and the folder of
the way you want. `callouts-panel.jsx` and `callout-toolbar.jsx` know both
ways; each way is one block in them, so delete the other.

## Details that are easy to miss

- The box of a callout holds the balloon **and** the tail. `inset` keeps a
  margin around the body for the tail, so the tail can point anywhere without
  a change of the box, and the text never moves when the tail moves.
- The Konva node of a custom element must have `name="element"`. Polotno finds
  the node of an element by this name.
- A drag on the tail handle sends its events up to the stage, where the editor
  moves all the selected elements. `event.cancelBubble = true` in
  `onDragStart`, `onDragMove` and `onDragEnd` of the handle stops this.
- Nothing may write the box of the text while the user moves or resizes it
  with the mouse: the transformer works from the size of the element, so a
  write in the middle of a drag makes the font size run away. See
  `isUserDragging` in `shared/text-box.js`.

## Run

```bash
npm install
npm run dev
```
