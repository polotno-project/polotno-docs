# polotno-docs

This is a Next.js application generated with
[Create Fumadocs](https://github.com/fuma-nama/fumadocs).

Run development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open http://localhost:3000 with your browser to see the result.

## Demo builds

All example apps under `examples/` can be bundled and copied into `public/demos` for static serving inside the docs site.

```bash
npm run build:demos
```

> Note: the `examples/` folder uses npm workspaces to share dependencies across demos. All demo packages are scoped as `@polotno-docs/<demo-name>` to ensure unique names. The build script will automatically run `npm install` in the examples folder if needed. This keeps the workspace isolated from the root Next.js app to avoid dependency conflicts.

The script installs dependencies (skipped when `node_modules/` already exists, unless you pass `--force-install`), builds each project with an adjusted public base, and writes a manifest to `public/docs/examples/manifest.json`.

- Use `npm run build:demos -- --skip-install` to reuse existing installs.
- Use `npm run build:demos -- --filter=polotno-demo` to target a subset (accepts RegExp).
- Use `npm run build:demos -- --clean` to clean build artifacts in examples folder and wipe `public/docs/examples` before copying results.
- Use `npm run build:demos -- --concurrency=8` to control parallel builds (default: 4).
- The script clears `dist/`, `build/`, and `out/` folders in each example after copying the artifacts.

Each successful build is available at `/docs/examples/<demo-name>/index.html` once you run `npm run dev` or `npm run start`.

## Explore

In the project, you can see:

- `lib/source.ts`: Code for content source adapter, [`loader()`](https://fumadocs.dev/docs/headless/source-api) provides the interface to access your content.
- `lib/layout.shared.tsx`: Shared options for layouts, optional but preferred to keep.

| Route                     | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `app/(home)`              | The route group for your landing page and other pages. |
| `app/docs`                | The documentation layout and pages.                    |
| `app/api/search/route.ts` | The Route Handler for search.                          |

### Fumadocs MDX

A `source.config.ts` config file has been included, you can customise different options like frontmatter schema.

Read the [Introduction](https://fumadocs.dev/docs/mdx) for further details.

## Learn More

To learn more about Next.js and Fumadocs, take a look at the following
resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Fumadocs](https://fumadocs.vercel.app) - learn about Fumadocs
