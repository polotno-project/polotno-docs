import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import 'polotno/ui.css';
import { registerImageTools } from './image-edit-api';

// Register the handlers once, before the editor renders. Each registered
// handler adds its tool to the "AI edit" menu of the image toolbar.
registerImageTools();

const store = createStore({
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.com/cabinet
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});

// Start with a photo that leaves room on the page for Expand.
const page = store.addPage({ width: 1080, height: 1080, background: '#f2f2f2' });
const photo = page.addElement({
  type: 'image',
  src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  x: 180,
  y: 300,
  width: 720,
  height: 481,
});
// Select it, so the image toolbar and its "AI edit" menu show on open.
store.selectElements([photo.id]);

export const App = () => (
  <PolotnoContainer style={{ width: '100vw', height: '100vh' }}>
    <SidePanelWrap>
      <SidePanel store={store} defaultSection="photos" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} />
      <Workspace store={store} />
      <ZoomButtons store={store} />
    </WorkspaceWrap>
  </PolotnoContainer>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
