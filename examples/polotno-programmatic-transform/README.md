# Transform Side Panel Demo

A custom Polotno side panel for programmatically controlling position, size, and rotation of selected elements.

## Features

- **Position controls** - Set X/Y coordinates of elements
- **Size controls** - Resize elements with locked aspect ratio
- **Rotation controls** - Rotate elements around their center
- **Multi-selection support** - Transform multiple elements together
- **Group support** - Works with grouped elements

## Key Implementation Details

- Uses Polotno's built-in math utilities: `getTotalClientRect`, `getCenter`, `rotateAroundPoint`
- Uses `forEveryChild` to iterate through group children
- Aspect ratio is always locked for consistent transformations
- For groups/multiple selections, rotation happens around the bounding box center
- Local rotation state tracks group/multi-selection rotation with automatic sync

## Links

- [Open Demo](http://polotno.com/docs/examples/polotno-programmatic-transform/index.html)
- [Edit in CodeSandbox](https://codesandbox.io/embed/github/polotno-project/polotno-docs/tree/main/examples/polotno-programmatic-transform?fontsize=14&hidenavigation=1&theme=dark&view=preview)
