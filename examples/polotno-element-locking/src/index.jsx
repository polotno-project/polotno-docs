import React from 'react';
import ReactDOM from 'react-dom/client';
import { observer } from 'mobx-react-lite';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, SectionTab, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { Button, Checkbox } from '@blueprintjs/core';
import { createStore } from 'polotno/model/store';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});

// Add demo elements
const page = store.addPage();
page.addElement({
  type: 'text',
  text: 'Locked Title',
  fontSize: 50,
  x: store.width / 2 - 150,
  y: 50,
  width: 300,
  draggable: false,
  removable: false,
});

page.addElement({
  type: 'text',
  text: 'Editable text',
  fontSize: 60,
  x: store.width / 2 - 150,
  y: 150,
  width: 300,
  contentEditable: true,
  styleEditable: false,
});

// Lock Controls Panel
const LockPanel = observer(({ store }) => {
  const el = store.selectedElements[0];

  if (!el) {
    return <div style={{ padding: 20 }}>Select an element</div>;
  }

  const toggle = (prop) => el.set({ [prop]: !el[prop] });

  return (
    <div style={{ padding: 10 }}>
      <Checkbox
        checked={el.selectable}
        onChange={() => toggle('selectable')}
        label="Selectable"
      />
      <Checkbox
        checked={el.draggable}
        onChange={() => toggle('draggable')}
        label="Draggable"
      />
      <Checkbox
        checked={el.resizable}
        onChange={() => toggle('resizable')}
        label="Resizable"
      />
      <Checkbox
        checked={el.removable}
        onChange={() => toggle('removable')}
        label="Removable"
      />
      <Checkbox
        checked={el.contentEditable}
        onChange={() => toggle('contentEditable')}
        label="Content Editable"
      />
      <Checkbox
        checked={el.styleEditable}
        onChange={() => toggle('styleEditable')}
        label="Style Editable"
      />

      <Button
        style={{ marginTop: 10 }}
        icon={el.locked ? 'unlock' : 'lock'}
        text={el.locked ? 'Unlock All' : 'Lock All'}
        intent={el.locked ? 'warning' : 'success'}
        onClick={() => {
          const state = !el.locked;
          el.set({
            draggable: state,
            resizable: state,
            removable: state,
            contentEditable: state,
            styleEditable: state,
          });
        }}
        fill
      />
    </div>
  );
});

// Custom Lock Section
const LockSection = {
  name: 'locks',
  Tab: (props) => (
    <SectionTab name="Locks" {...props}>
      <span role="img" aria-label="lock">🔒</span>
    </SectionTab>
  ),
  Panel: LockPanel,
};

export const App = observer(() => {
  return (
    <PolotnoContainer className="bp5-scope" style={{ width: '100vw', height: '100vh' }}>
      <SidePanelWrap>
        <SidePanel store={store} sections={[LockSection, ...DEFAULT_SECTIONS]} />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} />
        <Workspace store={store} />
        <ZoomButtons store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
