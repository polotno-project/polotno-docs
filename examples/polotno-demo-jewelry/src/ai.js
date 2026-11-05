// How AI renders run in this build.
//
//   pnpm dev            live, through the local Vite proxy (render-proxy.js)
//   ?k=<key>            live, through polotno.com's /api/demo/jewelry-render,
//                       which checks the key. This is the private version a
//                       prospect gets, on its own unlisted page.
//   no key              off: the public demo. The Render panel stays fully
//                       visible, and Render explains how to get the full demo.

const key = (() => {
  try {
    return new URLSearchParams(window.location.search).get('k') || '';
  } catch {
    return '';
  }
})();

export const AI = import.meta.env.DEV
  ? { live: true, endpoint: '/api/render', key: '' }
  : key
    ? { live: true, endpoint: '/api/demo/jewelry-render', key }
    : { live: false, endpoint: '', key: '' };

export const CONTACT_URL = 'https://polotno.com/contact';
