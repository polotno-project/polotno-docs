import React from 'react';
import ReactDOM from 'react-dom/client';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Workspace } from 'polotno/canvas/workspace';
import { createStore } from 'polotno/model/store';
import 'polotno/ui.css';
import './styles.css';
import { ROOM, ROOMS, SLOTS, slotById, asset, coloursFor, SOFT_SHADOW } from './scene';
import { tint } from './tint';

const store = createStore({ key: 'HyhTCjrrUThWw9E7dO_y', showCredit: false });
window.store = store;

// --- scene ---------------------------------------------------------------
// One page the size of the room photo, with the empty room as background and
// one image per slot on top. The room starts empty: each slot shows a +
// marker (plain HTML over the canvas) until a piece is picked for it. Pieces
// swap, recolour and resize in place; they don't move, since a photo only fits
// the spot it was taken for. A second page holds the "AI" room.

store.setSize(ROOM.width, ROOM.height);
const page = store.addPage({ background: asset(ROOM.src) });

for (const slot of SLOTS) {
  const first = slot.items[0];
  page.addElement({
    type: 'image',
    name: slot.id,
    src: asset(first.src),
    ...first.box,
    visible: false,
    draggable: false,
    removable: false,
    ...(slot.shadow ? SOFT_SHADOW : {}),
    custom: { item: first.id, colour: null },
  });
}
store.history.clear();

// The AI room isn't editable, so it's a plain photo shown in place of the
// canvas (see AiRoom), not a Polotno page.
const aiRoom = ROOMS[1];

const elementFor = (slotId) => page.children.find((el) => el.name === slotId);
const itemOf = (slot, el) => slot.items.find((i) => i.id === el.custom.item);

async function show(slotId, itemId, colour) {
  const slot = slotById(slotId);
  const item = slot.items.find((i) => i.id === itemId);
  // A colour only sticks to pieces that have a colour mask.
  const keep = item.colour ? colour : null;
  const src = keep ? await tint(asset(item.src), asset(item.colour), keep.rgb) : asset(item.src);
  const el = elementFor(slotId);
  // A new style starts at its own size; a new colour keeps any resizing.
  const box = el.custom.item === item.id ? {} : item.box;
  el.set({ src, ...box, visible: true, custom: { item: item.id, colour: keep } });
}

function remove(slotId) {
  elementFor(slotId).set({ visible: false });
  store.selectElements([]);
}

// --- UI ------------------------------------------------------------------

const Icon = ({ d, size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICONS = {
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'm15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  plus: 'M12 6v12M6 12h12',
  minus: 'M6 12h12',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  upload: 'M12 16V5m0 0-4 4m4-4 4 4M5 19h14',
  back: 'M15 18l-6-6 6-6',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5',
};

const CONTACT = `mailto:team@polotno.com?subject=${encodeURIComponent('Re: Room visualizer demo')}`;

// What the locked AI features would do, shown when someone tries one.
const AI_FEATURES = {
  split: {
    title: 'Separate layers with AI',
    text: 'In a full build, this splits the photo into the sofa, armchair, table, lamp, tree and rug, so each piece can be swapped and recoloured like in the first room.',
  },
  generate: {
    title: 'Generate a piece with AI',
    text: 'In a full build, you describe a piece, like a green velvet sofa with brass legs, and AI paints it into this spot in the room’s own light and angle.',
  },
  upload: {
    title: 'Upload your own piece, placed by AI',
    text: 'In a full build, you upload a product photo and AI fits it into this spot, matching the room’s angle and light.',
  },
};

// --- sidebar ---------------------------------------------------------------

// Room cards: in the sidebar on desktop, and as the first screen on phones.
const Rooms = ({ room, onChange, blurbs = false }) => (
  <div className={blurbs ? 'rd-rooms with-blurbs' : 'rd-rooms'}>
    {ROOMS.map((r) => (
      <button key={r.id} className={r.id === room ? 'rd-room on' : 'rd-room'} onClick={() => onChange(r.id)}>
        <img src={asset(r.thumb)} alt="" />
        <span className="rd-room-name">{r.label}</span>
        {blurbs && <span className="rd-room-blurb">{r.blurb}</span>}
      </button>
    ))}
  </div>
);

const BuiltWith = () => (
  <a className="rd-built" href="https://polotno.com" target="_blank" rel="noreferrer">
    Built with
    <span className="rd-brand-mark" />
    <strong>Polotno SDK</strong>
  </a>
);

// Phones open on this: pick a room, then the tool loads.
const RoomPicker = ({ room, onPick }) => (
  <div className="rd-picker">
    <div className="rd-title">
      Room visualizer <span className="rd-tag">Demo</span>
    </div>
    <h3>Choose a room</h3>
    <Rooms room={room} onChange={onPick} blurbs />
    <BuiltWith />
  </div>
);

const SlotEditor = observer(({ slotId, onAi }) => {
  const slot = slotById(slotId);
  const el = elementFor(slotId);
  const filled = el.visible;
  const current = filled ? itemOf(slot, el) : null;
  const colour = el.custom.colour;
  const [busy, setBusy] = React.useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rd-editor">
      <div className="rd-row">
        <span className="rd-label">{filled ? 'Style' : `Pick a ${slot.label.toLowerCase()} to add it`}</span>
        <div className="rd-styles">
          {slot.items.map((item) => (
            <button
              key={item.id}
              className={item.id === current?.id ? 'rd-style on' : 'rd-style'}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await show(slotId, item.id, colour);
                  store.selectElements([el.id]);
                })
              }
            >
              <img src={asset(item.src)} alt="" />
            </button>
          ))}
          <button className="rd-style rd-ai" onClick={() => onAi('generate')}>
            <span className="rd-badge">AI</span>
            <Icon d={ICONS.sparkle} />
            <span>Generate with AI</span>
          </button>
          <button className="rd-style rd-ai" onClick={() => onAi('upload')}>
            <span className="rd-badge">AI</span>
            <Icon d={ICONS.upload} />
            <span>Upload yours</span>
          </button>
        </div>
      </div>

      {current?.colour && (
        <div className="rd-row">
          <span className="rd-label">Colour</span>
          <div className="rd-swatches">
            <button
              className={!colour ? 'rd-swatch rd-original on' : 'rd-swatch rd-original'}
              title="Original"
              disabled={busy}
              onClick={() => run(() => show(slotId, current.id, null))}
            />
            {coloursFor(slotId).map((c) => (
              <button
                key={c.name}
                className={colour?.name === c.name ? 'rd-swatch on' : 'rd-swatch'}
                style={{ background: `rgb(${c.rgb.join(',')})` }}
                title={c.name}
                disabled={busy}
                onClick={() => run(() => show(slotId, current.id, c))}
              />
            ))}
          </div>
        </div>
      )}

      {filled && (
        <label className="rd-row rd-toggle">
          <span className="rd-label">Soft shadow</span>
          <input
            type="checkbox"
            checked={el.shadowEnabled}
            onChange={(e) => el.set(e.target.checked ? SOFT_SHADOW : { shadowEnabled: false })}
          />
        </label>
      )}

      {filled && (
        <button className="rd-remove" onClick={() => remove(slotId)}>
          Remove {slot.label.toLowerCase()}
        </button>
      )}
    </div>
  );
});

const Furniture = observer(({ slotId, onPick, onAi }) => (
  <>
    <div className="rd-slots">
      {[...SLOTS].reverse().map((slot) => (
        <button
          key={slot.id}
          className={slot.id === slotId ? 'rd-slot on' : 'rd-slot'}
          onClick={() => onPick(slot.id)}
        >
          {elementFor(slot.id).visible && <span className="rd-dot" />}
          {slot.label}
        </button>
      ))}
    </div>
    {slotId ? (
      <SlotEditor slotId={slotId} onAi={onAi} />
    ) : (
      <p className="rd-hint">Pick a piece above, or tap a + in the room.</p>
    )}
  </>
));

const AiRoomCard = ({ onAi, onHover }) => (
  <div className="rd-editor">
    <p className="rd-hint">
      A furnished photo, before any editing. The highlighted pieces are what AI can lift out into
      separate layers.
    </p>
    <button
      className="rd-button primary rd-split"
      onClick={() => onAi('split')}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <span className="rd-split-icon">✦</span>
      Separate layers with AI
    </button>
  </div>
);

// --- over the room -------------------------------------------------------

// Where the page sits inside the stage. Polotno centres the page in its
// container at `store.scale`, so a room point maps to the screen from the
// container's box.
function usePageBox() {
  const [box, setBox] = React.useState(null);
  React.useEffect(() => {
    let frame;
    const measure = () => {
      const page = document.querySelector('.polotno-page-container');
      const stage = document.querySelector('.rd-stage');
      if (page && stage) {
        const r = page.getBoundingClientRect();
        const s = stage.getBoundingClientRect();
        const next = { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height };
        setBox((b) =>
          b && b.left === next.left && b.top === next.top && b.width === next.width && b.height === next.height
            ? b
            : next,
        );
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!box) return null;
  const s = store.scale;
  return {
    x: box.left + (box.width - store.width * s) / 2,
    y: box.top + (box.height - store.height * s) / 2,
    s,
  };
}

// The + markers for empty slots: a white dot with the plus cut out of it, which
// opens into a labelled pill on hover.
const Markers = observer(({ active, onPick }) => {
  const at = usePageBox();
  if (!at) return null;
  return SLOTS.filter((slot) => !elementFor(slot.id).visible).map((slot) => (
    <button
      key={slot.id}
      className={slot.id === active ? 'rd-spot on' : 'rd-spot'}
      style={{ left: at.x + slot.spot.x * at.s, top: at.y + slot.spot.y * at.s }}
      onClick={() => onPick(slot.id)}
    >
      <svg className="rd-spot-dot" viewBox="0 0 36 36" width="36" height="36">
        <path
          fillRule="evenodd"
          fill="white"
          d="M18 0a18 18 0 1 1 0 36a18 18 0 1 1 0-36ZM16.6 11h2.8v5.6H25v2.8h-5.6V25h-2.8v-5.6H11v-2.8h5.6Z"
        />
      </svg>
      <span className="rd-spot-open">
        <Icon d={ICONS.plus} />
        <span>Add {slot.label.toLowerCase()}</span>
      </span>
    </button>
  ));
});

// The AI room: its photo, fitted like the canvas, with a soft band of light
// that sweeps over its pieces (masked to their silhouettes) every few seconds.
const AiRoom = ({ strong }) => {
  const mask = `url(${asset(aiRoom.mask)})`;
  return (
    <div className="rd-ai-room">
      <div className="rd-ai-frame">
        <img src={asset(aiRoom.src)} alt="A furnished living room with sage walls" />
        <div
          className={strong ? 'rd-sweep strong' : 'rd-sweep'}
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        />
      </div>
    </div>
  );
};

// Zoom is relative to Polotno's own fit, so 100% is the whole room in view.
// Polotno refits when the room area changes size; read its scale just after.
function useFitScale() {
  const [fit, setFit] = React.useState(store.scale);
  React.useEffect(() => {
    const el = document.querySelector('.polotno-workspace-container');
    let timer;
    const read = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setFit(store.scale), 120);
    };
    read();
    const observer = new ResizeObserver(read);
    if (el) observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);
  return fit;
}

const Toolbar = observer(({ isAiRoom, onDownload }) => {
  const fit = useFitScale();
  const zoom = (k) => store.setScale(Math.min(fit * 4, Math.max(fit * 0.5, store.scale * k)));
  return (
    <div className="rd-toolbar">
      {!isAiRoom && (
        <div className="rd-group">
          <button className="rd-icon" disabled={!store.history.canUndo} onClick={() => store.history.undo()} aria-label="Undo">
            <Icon d={ICONS.undo} />
          </button>
          <button className="rd-icon" disabled={!store.history.canRedo} onClick={() => store.history.redo()} aria-label="Redo">
            <Icon d={ICONS.redo} />
          </button>
        </div>
      )}
      {!isAiRoom && (
      <div className="rd-group rd-zoom-group">
        <button className="rd-icon" onClick={() => zoom(1 / 1.25)} aria-label="Zoom out">
          <Icon d={ICONS.minus} />
        </button>
        <button className="rd-zoom" onClick={() => store.setScale(fit)} title="Fit to screen">
          {Math.round((store.scale / fit) * 100)}%
        </button>
        <button className="rd-icon" onClick={() => zoom(1.25)} aria-label="Zoom in">
          <Icon d={ICONS.plus} />
        </button>
        <button className="rd-icon" onClick={() => store.setScale(fit)} aria-label="Fit to screen">
          <Icon d={ICONS.fit} />
        </button>
      </div>
      )}
      <div className="rd-group">
        <button className="rd-icon" onClick={onDownload} aria-label="Download">
          <Icon d={ICONS.download} />
        </button>
      </div>
    </div>
  );
});

const AiOff = ({ kind, onClose }) => (
  <div className="rd-modal-wrap" onClick={onClose}>
    <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
      <span className="rd-modal-icon">✦</span>
      <h2>{AI_FEATURES[kind].title}</h2>
      <p>{AI_FEATURES[kind].text}</p>
      <p className="rd-modal-note">Live AI is switched off in this public demo.</p>
      <div className="rd-modal-actions">
        <a className="rd-button primary" href={CONTACT}>
          Email us for the full demo
        </a>
        <button className="rd-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  </div>
);

// --- app -----------------------------------------------------------------

function useMedia(query) {
  const [match, setMatch] = React.useState(() => window.matchMedia(query).matches);
  React.useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatch(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return match;
}

const App = observer(() => {
  const [slotId, setSlotId] = React.useState(null);
  const [room, setRoom] = React.useState(ROOMS[0].id);
  const [ai, setAi] = React.useState(null);
  const [hoverSplit, setHoverSplit] = React.useState(false);
  const isAiRoom = room === aiRoom.id;
  // Phones get the room edge to edge; the 720px breakpoint matches styles.css.
  const narrow = useMedia('(max-width: 720px)');
  // Phones start on the room picker; desktop goes straight to the tool.
  const [picked, setPicked] = React.useState(false);

  // Tapping a piece on the canvas opens it in the sidebar.
  React.useEffect(
    () =>
      reaction(
        () => store.selectedElements[0]?.name,
        (name) => name && setSlotId(name),
      ),
    [],
  );

  const pick = (id) => {
    setSlotId(id);
    const el = elementFor(id);
    store.selectElements(el.visible ? [el.id] : []);
  };

  const switchRoom = (id) => {
    setRoom(id);
    store.selectElements([]);
  };

  const download = async () => {
    if (isAiRoom) {
      const a = document.createElement('a');
      a.href = asset(aiRoom.src);
      a.download = 'room.webp';
      a.click();
      return;
    }
    store.selectElements([]);
    const url = await store.toDataURL({ mimeType: 'image/jpeg', pixelRatio: 0.75, pageId: store.activePage.id });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'room.jpg';
    a.click();
  };

  if (narrow && !picked)
    return (
      <div className="rd-app">
        <RoomPicker
          room={room}
          onPick={(id) => {
            switchRoom(id);
            setPicked(true);
          }}
        />
      </div>
    );

  return (
    <div className="rd-app">
      <aside className="rd-sidebar">
        <header className="rd-head">
          <button className="rd-back" onClick={() => setPicked(false)} aria-label="Choose another room">
            <Icon d={ICONS.back} />
          </button>
          <div className="rd-title">
            Room visualizer <span className="rd-tag">Demo</span>
          </div>
        </header>
        <div className="rd-side-body">
          <section className="rd-room-section">
            <h3>Room</h3>
            <Rooms room={room} onChange={switchRoom} />
          </section>
          <section>
            <h3>{isAiRoom ? 'AI layers' : 'Furniture'}</h3>
            {isAiRoom ? (
              <AiRoomCard onAi={setAi} onHover={setHoverSplit} />
            ) : (
              <Furniture slotId={slotId} onPick={pick} onAi={setAi} />
            )}
          </section>
          <BuiltWith />
        </div>
      </aside>

      <main className="rd-stage">
        <Workspace
          store={store}
          backgroundColor="#161616"
          pageControlsEnabled={false}
          paddingX={narrow ? 8 : 20}
          paddingY={narrow ? 52 : 64}
          components={{ Tooltip: () => null, ContextMenu: () => null }}
          pageBorderColor="transparent"
          activePageBorderColor="transparent"
          highlighterStyle={{ stroke: 'rgba(255,255,255,0.75)', strokeWidth: 1.5 }}
          transformerStyle={{
            borderStroke: 'rgba(255,255,255,0.9)',
            borderStrokeWidth: 1,
            borderDash: [5, 5],
            anchorFill: '#ffffff',
            anchorStroke: 'rgba(0,0,0,0.2)',
            anchorStrokeWidth: 1,
            anchorSize: 11,
            anchorCornerRadius: 6,
            rotateEnabled: false,
            enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
            keepRatio: true,
          }}
        />
        {isAiRoom ? <AiRoom strong={hoverSplit} /> : <Markers active={slotId} onPick={pick} />}
        <Toolbar isAiRoom={isAiRoom} onDownload={download} />
      </main>

      {ai && <AiOff kind={ai} onClose={() => setAi(null)} />}
    </div>
  );
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
