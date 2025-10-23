import '@blueprintjs/core/lib/css/blueprint.css';

import { createDemoApp } from 'polotno/polotno-app';
import { unstable_setTextVerticalResizeEnabled } from 'polotno/config';

unstable_setTextVerticalResizeEnabled(true);

const { store } = createDemoApp({
  container: document.getElementById('root'),
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.com/cabinet
  key: 'nFA5H9elEytDyPyvKL7T',
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});

store.activePage.addElement({
  type: 'text',
  text: 'Try to resize me vertically',
  y: 300,
  x: store.width / 2 - 200,
  fontSize: 80,
  width: 400,
  height: 400,
});
