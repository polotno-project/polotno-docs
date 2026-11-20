# Event badges from a guest list

One badge template, filled once per guest. The template uses each kind of
template variable: `{{name}}`, `{{role}}` and `{{company}}` in its text, a
photo bound with `bindings: { src: 'photo' }` and cropped with `fit: 'cover'`,
two accent shapes bound with `bindings: { fill: 'accent' }`, and a VIP ribbon
bound with `bindings: { visible: 'vip' }`.

- **Variables panel**: edit the template's variables, their labels, defaults
  and required flags, and bind the selected element.
- **Guest list**: the columns come from `getVariables`, so a variable added in
  the panel adds a column. Paste rows from a spreadsheet or a CSV file.
- **Generate badges**: `resolveVariables` fills the template with each row,
  and `@polotno/image-export` renders each badge as a PNG in the browser. A
  row's issues, such as a missing required name, show on its card, and its
  badge still renders with the token in place.

The photos are generated SVG avatars: initials on a coloured background.

## Links

- [Documentation](https://polotno.com/docs/dynamic-template-variables)
- [Open Demo](http://polotno.com/docs/examples/polotno-event-badges/index.html)
