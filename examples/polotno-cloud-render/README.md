# Cloud Render

Demo showing how to use the Polotno Cloud Render API: paste a design JSON, pick a format (PNG, JPEG, PDF, GIF, MP4, PPTX) and its options – quality, DPI, vector PDF, print-ready PDF/X-4, CMYK color profiles, bleed, error skipping, text overflow, webhooks – and render.

The sample design is a template: its name prints the `{{name}}` [template variable](https://polotno.com/docs/dynamic-template-variables). The **Variables (JSON)** field sends one record as `variables`, and **Strict** sends `strict: true`, so a record without `name` fails the job with `VARIABLES_INVALID`. A failed job shows its `error` in the preview.

## Links

- [Open Demo](http://polotno.com/docs/examples/polotno-cloud-render/index.html)
- [Edit in CodeSandbox](https://codesandbox.io/embed/github/polotno-project/polotno-docs/tree/main/examples/polotno-cloud-render?fontsize=14&hidenavigation=1&theme=dark&view=preview)
