import React from 'react';
import ReactDOM from 'react-dom/client';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { PolotnoContainer, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';
import { getImageSize, getCrop } from 'polotno/utils/image';
import { Button } from 'polotno/primitives';
import { jsonToPDFBlob } from '@polotno/pdf-export/browser';
import 'polotno/ui.css';
import '../../shared/studio-theme.css';
import { POSTCARD_TEMPLATES, TEMPLATE_IDS, FONTS, INK_COLORS, PHOTO_EXAMPLES, HOUSE_EXAMPLES, HEADSHOT_EXAMPLES } from './templates';
import {
  Stepper,
  ColorDropdown,
  FontDropdown,
  SizeInput,
  TemplateGrid,
  ReplacePhotoPanel,
  DownloadIcon,
} from './ui.jsx';

const store = createStore({ key: 'HyhTCjrrUThWw9E7dO_y', showCredit: false });
window.store = store;

const templateList = TEMPLATE_IDS.map((id) => ({ id, ...POSTCARD_TEMPLATES[id] }));

// --- store helpers -------------------------------------------------------

const frontPage = () => store.pages[0];
const backPage = () => store.pages[1];

// Element detection by layer-name convention (with custom.role as a fallback so the
// older hand-built templates keep working):
//   *-accent      → recoloured by the Accent control
//   *background*  → recoloured by the Background control
//   *placeholder* → click-to-replace photo area
//   greeting*     → the message text (Font / Colour / Size)
const lname = (el) => (el.name || '').toLowerCase();
const isAccent = (el) => lname(el).includes('accent') || el.custom?.role === 'accent';
const isBackground = (el) => lname(el).includes('background') || el.custom?.role === 'background';
const isPlaceholder = (el) =>
  lname(el).includes('placeholder') || el.custom?.isPlaceholder || el.custom?.role === 'photo';
const isGreeting = (el) => lname(el).startsWith('greeting') || el.custom?.role === 'greeting';

const pageEls = (page, pred) => (page ? page.children.filter(pred) : []);

// Parse any CSS color (#rgb, #rrggbb, rgb(), rgba()) to {r,g,b} for value comparison.
function parseColor(c) {
  if (!c || typeof c !== 'string') return null;
  const s = c.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16) };
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16) };
  m = s.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return null;
}
function sameColor(a, b) {
  const x = parseColor(a);
  const y = parseColor(b);
  return !!x && !!y && x.r === y.r && x.g === y.g && x.b === y.b;
}

function recolorAccent(color) {
  // Accent elements can live on either side of the card (e.g. the corner stars sit
  // on both front and back), so recolour every page — not just the front.
  const accents = store.pages.flatMap((p) => p.children.filter(isAccent));
  const old = accents.find((el) => el.fill)?.fill;
  accents.forEach((el) => el.set({ fill: color }));
  // Also update inline text spans coloured with the old accent (e.g. a coloured
  // word inside a headline), matched by colour value so rgb/rgba/hex all work.
  if (old) {
    store.pages.forEach((page) =>
      page.children.forEach((el) => {
        if (el.type !== 'text' || typeof el.text !== 'string' || !/color\s*:/i.test(el.text)) return;
        // Match a `color:` value up to the next ; or " — includes rgb()/rgba() parens.
        // Lookbehind avoids matching background-color / border-color, etc.
        const next = el.text.replace(/(?<![-\w])color\s*:\s*([^;"]+)/gi, (full, col) =>
          sameColor(col, old) ? `color: ${color}` : full
        );
        if (next !== el.text) el.set({ text: next });
      })
    );
  }
}
function setBackground(color) {
  const bg = pageEls(frontPage(), isBackground);
  if (bg.length) bg.forEach((el) => el.set({ fill: color }));
  else frontPage()?.set({ background: color });
}
// All greeting/message elements on the back (a template may tag more than one).
function greetingEls() {
  return pageEls(backPage(), isGreeting);
}
function greetingEl() {
  return greetingEls()[0];
}
// Text elements currently selected on the canvas (drives per-element editing).
function selectedTextEls() {
  return store.selectedElements.filter((el) => el.type === 'text');
}

// A placeholder shows a hint overlay (dim + photo icon) until it's replaced. Selecting
// it opens the Replace-photo panel; replacing swaps the src (cover-cropped) and drops
// the overlay. Overlay elements are excluded from export and never selectable.
const PH_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>'
  );

function addPlaceholderHints() {
  const page = frontPage();
  if (!page) return;
  pageEls(page, isPlaceholder).forEach((ph) => {
    if (ph.custom?.replaced) return;
    if (page.children.some((el) => el.custom?.hintFor === ph.id)) return;
    page.addElement({
      type: 'figure',
      subType: 'rect',
      name: 'ph-hint',
      x: ph.x, y: ph.y, width: ph.width, height: ph.height,
      fill: 'rgba(18,18,18,0.34)',
      selectable: false,
      showInExport: false,
      custom: { hintFor: ph.id },
    });
    const size = Math.min(ph.width, ph.height) * 0.16;
    page.addElement({
      type: 'image',
      name: 'ph-hint',
      src: PH_ICON,
      x: ph.x + ph.width / 2 - size / 2,
      y: ph.y + ph.height / 2 - size / 2,
      width: size, height: size,
      keepRatio: true,
      selectable: false,
      showInExport: false,
      custom: { hintFor: ph.id },
    });
  });
}

function removePlaceholderHints(phId) {
  const page = frontPage();
  if (!page) return;
  const ids = page.children.filter((el) => el.custom?.hintFor === phId).map((el) => el.id);
  if (ids.length) store.deleteElements(ids);
}

async function replaceSelectedWith(src) {
  const ph = store.selectedElements.find(isPlaceholder) || pageEls(frontPage(), isPlaceholder)[0];
  if (!ph) return;
  try {
    const { width, height } = await getImageSize(src);
    const crop = getCrop(ph, { width, height });
    // Headshots: bias the vertical crop toward the top so the head isn't cut off
    // (a centred cover-crop slices the top of the head on portrait photos).
    if (lname(ph).includes('headshot') && crop.cropHeight < 1) {
      crop.cropY = (1 - crop.cropHeight) * 0.1;
    }
    ph.set({ src, ...crop, custom: { ...ph.custom, replaced: true } });
  } catch (e) {
    ph.set({ src, custom: { ...ph.custom, replaced: true } });
  }
  removePlaceholderHints(ph.id);
}

// --- toolbars (observer → live active states) ----------------------------

const FrontToolbar = observer(({ palette }) => {
  const accent = pageEls(frontPage(), isAccent)[0]?.fill;
  const bg = pageEls(frontPage(), isBackground)[0]?.fill ?? frontPage()?.background;
  return (
    <>
      <ColorDropdown label="Accent" colors={palette} activeColor={accent} onSelect={recolorAccent} disabledColor={bg} />
      <ColorDropdown label="Background" colors={palette} activeColor={bg} onSelect={setBackground} disabledColor={accent} />
    </>
  );
});

const BackToolbar = observer(({ fonts }) => {
  // Fully selection-driven: the controls only show when a text element is selected,
  // and they edit ONLY that selection. (The Back step pre-selects the headline so the
  // controls are visible on arrival; clicking empty canvas hides them again.)
  const sel = selectedTextEls();
  if (!sel.length) return null;
  const g = sel[0];
  return (
    <>
      <FontDropdown
        fonts={fonts}
        activeFont={g?.fontFamily}
        onSelect={(f) => {
          sel.forEach((el) => el.set({ fontFamily: f }));
          store.loadFont(f);
        }}
      />
      <ColorDropdown
        label="Colour"
        colors={INK_COLORS}
        activeColor={g?.fill}
        onSelect={(c) => sel.forEach((el) => el.set({ fill: c }))}
      />
      <SizeInput value={g?.fontSize} onChange={(v) => sel.forEach((el) => el.set({ fontSize: v }))} />
    </>
  );
});

// --- download ------------------------------------------------------------

// Vector PDF (selectable text, scalable shapes) via @polotno/pdf-export, not the
// raster store.saveAsPDF(). Falls back to raster only if the vector path errors.
async function download() {
  await store.waitLoading();
  try {
    const blob = await jsonToPDFBlob(store.toJSON());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'postcard.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('vector PDF export failed, falling back to raster', e);
    await store.saveAsPDF({ fileName: 'postcard.pdf' });
  }
}

// --- app -----------------------------------------------------------------

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  background: 'var(--background)',
  borderBottom: '1px solid var(--border)',
  flex: '0 0 auto',
};

function App() {
  const [step, setStep] = React.useState('Style');
  const [templateId, setTemplateId] = React.useState(null);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [phKind, setPhKind] = React.useState('photo');
  const [loading, setLoading] = React.useState(false);
  const palette = templateId ? POSTCARD_TEMPLATES[templateId].colors : [];
  const uploadRef = React.useRef(null);

  // Open the Replace-photo panel whenever a placeholder is selected, and remember
  // its kind so the panel can offer the right examples (portraits for a headshot).
  React.useEffect(() => {
    const dispose = reaction(
      () => store.selectedElements.map((el) => el.id).join(','),
      () => {
        const ph = store.selectedElements.find(isPlaceholder);
        setPanelOpen(!!ph);
        if (ph) {
          const n = lname(ph);
          setPhKind(n.includes('headshot') ? 'headshot' : n.includes('property') ? 'property' : 'photo');
        }
      }
    );
    return () => dispose();
  }, []);

  // Hide Polotno's "Effects" toolbar button, and keep password managers (Dashlane,
  // 1Password, LastPass) from injecting their icon into any input.
  React.useEffect(() => {
    const HIDE = new Set(['effects', 'apply mask']);
    const clean = () => {
      document.querySelectorAll('button').forEach((b) => {
        if (HIDE.has((b.textContent || '').trim().toLowerCase())) b.style.display = 'none';
      });
      document.querySelectorAll('input:not([data-form-type])').forEach((inp) => {
        inp.setAttribute('autocomplete', 'off');
        inp.setAttribute('data-form-type', 'other');
        inp.setAttribute('data-lpignore', 'true');
        inp.setAttribute('data-1p-ignore', '');
        inp.setAttribute('data-dashlane-ignore', 'true');
      });
    };
    clean();
    const mo = new MutationObserver(clean);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);


  const goStep = (s) => {
    setStep(s);
    store.selectElements([]);
    setPanelOpen(false);
    if (store.pages.length) {
      store.selectPage(store.pages[s === 'Write' ? 1 : 0].id);
    }
    // On the Back step, pre-select the headline/greeting so the Font/Colour/Size
    // controls appear straight away pointed at it (each card tags its own hero text).
    if (s === 'Write') {
      const hero = greetingEl();
      if (hero) store.selectElements([hero.id]);
    }
  };

  // Lazy-load the (heavy) scene JSON only now, on click — the grid itself never
  // touches it. Step over to Design immediately; the canvas fills in when it lands.
  const chooseTemplate = async (id) => {
    setTemplateId(id);
    setStep('Design');
    setLoading(true);
    store.clear();
    try {
      const json = await POSTCARD_TEMPLATES[id].load();
      store.loadJSON(json);
      if (store.pages.length) store.selectPage(store.pages[0].id);
      addPlaceholderHints();
    } catch (e) {
      console.error('failed to load template', e);
    }
    setLoading(false);
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => replaceSelectedWith(ev.target?.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: 'var(--background)' }}>
      {/* header: centered stepper */}
      <div style={{ ...rowStyle, height: 56, justifyContent: 'center' }}>
        <Stepper current={step} onStep={goStep} hasTemplate={!!templateId} />
      </div>

      {/* page toolbar (Design / Write) */}
      {step !== 'Style' && (
        <div style={{ ...rowStyle, height: 54, gap: 10 }}>
          {step === 'Design' ? (
            <FrontToolbar palette={palette} />
          ) : (
            <BackToolbar fonts={(templateId && POSTCARD_TEMPLATES[templateId].fonts) || FONTS} />
          )}
          <Button
            onClick={download}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <DownloadIcon /> Download
          </Button>
        </div>
      )}

      {/* stage */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, position: 'relative' }}>
          {step === 'Style' ? (
            <TemplateGrid templates={templateList} onChoose={chooseTemplate} />
          ) : (
            <PolotnoContainer style={{ width: '100%', height: '100%' }}>
            <WorkspaceWrap>
              {/* On Write the top toolbar already covers font/colour/size, so we
                  hide Polotno's element toolbar there to avoid a duplicate panel. */}
              {step === 'Design' && <Toolbar store={store} downloadButtonEnabled={false} />}
              <Workspace
                store={store}
                renderOnlyActivePage
                backgroundColor="#f4f4f4"
                components={{ PageControls: () => null }}
              />
              <ZoomButtons store={store} />
            </WorkspaceWrap>
          </PolotnoContainer>
          )}
          {loading && step !== 'Style' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f4f4f4',
                color: 'var(--muted-foreground)',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Loading…
            </div>
          )}
        </div>
        {step === 'Design' && panelOpen && (
          <ReplacePhotoPanel
            examples={phKind === 'headshot' ? HEADSHOT_EXAMPLES : phKind === 'property' ? HOUSE_EXAMPLES : PHOTO_EXAMPLES}
            onPick={replaceSelectedWith}
            onUpload={() => uploadRef.current?.click()}
            onClose={() => {
              store.selectElements([]);
              setPanelOpen(false);
            }}
          />
        )}
      </div>
      <input ref={uploadRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onUpload} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
