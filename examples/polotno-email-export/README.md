# Email builder

An email builder on top of Polotno that exports with
[`@polotno/email-export`](https://polotno.com/docs/email-export). The layout
follows the email builders people already know: content and blocks in a
side panel, a desktop and a mobile layout, an audit and a preview.

- **Content**: heading, paragraph, button, image, divider and spacer. New
  content goes under the selected element and pushes the rest down; the page
  grows. Merge tags stay in the HTML because the text stays live.
- **Blocks**: header, hero, article, two columns, call to action and footer,
  built for the width of the page you are editing.
- **Body**: background, email height and the font for new content, with the
  fallback Gmail and Outlook show.
- **Desktop and mobile**: the 600 px page is the email; the 350 px page is what
  phones show (`mobilePageId`).
- **Audit**: the export runs after every edit. Each warning says what a client
  will show differently; click one to select the element. Most come with a
  one-click fix (bring the text to front, narrow its box, use the fallback
  font, remove an effect), and the canvas outlines every text that would be
  sent as an image.
- **Preview**: the exported HTML, as Apple Mail, Gmail, Outlook or with images
  off, at desktop or phone width. Copy it, download it, or send it to
  yourself.
- **Send test email**: on polotno.com, type an address and send the current
  design to it. The endpoint is `app/api/demo/email-test` in the website (bot
  check, a few sends per hour); your app sends with its own email
  service.

What can't work in email is gone: no gradient text, text effects, animation or
text rotation, one email width, and no page controls.

The demo embeds image slices as data URLs so the file opens anywhere. Gmail
drops data URLs: in your app, `uploadImage` hosts each slice and returns its
https URL.

## Links

[Open Demo](http://polotno.com/docs/examples/polotno-email-export/index.html)

[Edit in CodeSandbox](https://codesandbox.io/embed/github/polotno-project/polotno-docs/tree/main/examples/polotno-email-export?fontsize=14&hidenavigation=1&theme=dark&view=preview)
