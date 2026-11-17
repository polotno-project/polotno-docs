# Sticker cut line

A sticker editor that traces a cut line around the artwork and exports it as a
spot ink.

- The magenta line is traced from the artwork's transparency, offset by a set
  distance, and redrawn after every edit.
- It is an ordinary SVG element in a colour no artwork uses. `@polotno/pdf-export`
  maps that colour through `spotColors` to an ink named `CutContour` with
  overprint, so the line reaches the PDF as its own separation.
- Tracing runs in the browser on a 600-cell grid: alpha mask, grow by the
  offset, split into pieces, trace each outline, simplify, round the corners
  (`src/contour.js`).

Not covered: holes inside the shape, more than one sticker per sheet, and
checking against a specific cutter. Check the ink name your RIP or cutter reads.
