import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // basePath: '/docs',
  assetPrefix: '/docs',
};

export default withMDX(config);
