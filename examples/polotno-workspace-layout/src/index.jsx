import React from 'react';
import ReactDOM from 'react-dom/client';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import { Button, ButtonGroup, Navbar, NavbarGroup, NavbarHeading } from '@blueprintjs/core';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});
const intro = store.addPage();

// Prepare sample pages
intro.set({ name: 'Intro' });
intro.addElement({
  type: 'text',
  text: 'Intro page',
  x: store.width / 2 - 200,
  y: 220,
  width: 400,
  fontSize: 48,
  align: 'center',
});

const gallery = store.addPage({ name: 'Gallery' });
gallery.addElement({
  type: 'text',
  text: 'Gallery page',
  x: store.width / 2 - 200,
  y: 220,
  width: 400,
  fontSize: 48,
  align: 'center',
});

const summary = store.addPage({ name: 'Summary' });
summary.addElement({
  type: 'text',
  text: 'Summary page',
  x: store.width / 2 - 200,
  y: 220,
  width: 400,
  fontSize: 48,
  align: 'center',
});

export const App = () => {
  const [layout, setLayout] = React.useState('horizontal');

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar>
        <NavbarGroup>
          <NavbarHeading>Workspace layout</NavbarHeading>
        </NavbarGroup>
        <NavbarGroup align="right">
          <ButtonGroup>
            <Button active={layout === 'vertical'} onClick={() => setLayout('vertical')}>
              Vertical
            </Button>
            <Button active={layout === 'horizontal'} onClick={() => setLayout('horizontal')}>
              Horizontal
            </Button>
          </ButtonGroup>
        </NavbarGroup>
      </Navbar>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Workspace store={store} layout={layout} />
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
