import React from 'react';
import { observer } from 'mobx-react-lite';
import { observable, runInAction } from 'mobx';
import { SectionTab } from 'polotno/side-panel';
// All controls are Polotno's own shadcn-style primitives (base-ui + Tailwind,
// `pn:`-prefixed). The inline styles below are layout only: grids, gaps and
// thumbnail sizes, since the published CSS ships no plain Tailwind classes.
import {
  Button,
  buttonVariants,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldRow,
  PanelHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SliderField,
  Spinner,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from 'polotno/primitives';
import { CUTS, STONES, SIZES_MM, gemSvg, gemSizeMm, roundDiamondCarat, paveSvg } from './gems.js';
import { METALS, SHANKS, SETTINGS, FINISHES, REACH, shankPart, settingPart, beadColors } from './metal.js';
import { PX, kindOf, addPart, updatePart, applySetting, settingOf, setAllMetal, metalParts, STARTERS, loadStarter } from './parts.js';
import { starterThumb } from './thumbs.js';
import { SCENES, CUSTOM, sceneLabel, MODELS, modelById, promptFor, renders, runRenders } from './render.js';
import { AI, CONTACT_URL } from './ai.js';
import { LayoutGrid, Gem, SlidersHorizontal, Sparkles } from 'lucide-react';
import { ensureGrid } from './grid.js';
import { theme } from './theme.js';

// What new parts are made of. Panels read it, the toolbar changes parts.
export const prefs = observable({ metal: 'white', stone: 'diamond', size: 6.5, setting: 'prong4' });

// --- layout helpers (inline styles: layout only) ----------------------------------------------

// Tab icons: Lucide, the set Polotno's own controls use, drawn finer than
// the default for a lighter look. Lucide has no ring, so Metal gets one drawn
// on the same 24 px grid and stroke.
const STROKE = 1.4;
const RingIcon = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="14" rx="8" ry="6.5" />
    <ellipse cx="12" cy="14" rx="5.2" ry="4" />
    <path d="M9.5 5.5 12 3l2.5 2.5L12 8z" />
  </svg>
);
const ICONS = {
  designs: (p) => <LayoutGrid size={20} strokeWidth={STROKE} {...p} />,
  metal: (p) => <RingIcon {...p} />,
  stones: (p) => <Gem size={20} strokeWidth={STROKE} {...p} />,
  settings: (p) => <SlidersHorizontal size={20} strokeWidth={STROKE} {...p} />,
  render: (p) => <Sparkles size={20} strokeWidth={STROKE} {...p} />,
};

const Stack = ({ children, gap = 14 }) => <div style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>;
const Grid = ({ children, min }) => <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 8 }}>{children}</div>;
const Hint = ({ children }) => <p style={{ fontSize: 12, color: 'var(--pn-muted-foreground)', lineHeight: 1.5, margin: 0 }}>{children}</p>;
// Section titles in the display serif.
const Label = ({ children }) => <p style={{ fontFamily: 'var(--jw-display)', fontSize: 17, fontWeight: 500, letterSpacing: 0.01, margin: '8px 0 -4px' }}>{children}</p>;

// A Polotno panel: header with a working close button, scrolling body.
const Panel = ({ store, title, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 12px 0 20px' }}>
    <PanelHeader title={title} onClose={() => store.openSidePanel('')} />
    <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px 32px 0' }}>
      <Stack gap={16}>{children}</Stack>
    </div>
  </div>
);

// A picker card: Polotno's ghost Button, a square preview with no backdrop
// (the parts sit on the panel itself) and the name in the display serif.
// Selected cards get a fine gold border.
const Card = ({ src, label, onClick, selected, disabled, ratio = 1, children }) => (
  <Button
    variant="ghost"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    style={{
      height: 'auto',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 8,
      padding: 10,
      whiteSpace: 'normal',
      border: `1px solid ${selected ? 'var(--jw-selected)' : 'var(--pn-border)'}`,
    }}
  >
    <div style={{ width: '100%', aspectRatio: String(ratio), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children || <img src={src} alt="" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />}
    </div>
    <span style={{ fontFamily: 'var(--jw-display)', fontSize: 15, fontWeight: 500, color: selected ? 'var(--jw-selected)' : undefined }}>{label}</span>
  </Button>
);

const swatch = (ramp, size) => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  flexShrink: 0,
  background: `radial-gradient(circle at 35% 35%, ${ramp[4]}, ${ramp[2]} 55%, ${ramp[0]})`,
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
});

// --- shared controls (also used by the toolbar) ------------------------------------------------

// Compact metal switch for the toolbar.
export const MetalToggle = observer(({ value, onChange }) => (
  <ToggleGroup value={[value]} onValueChange={(v) => v[0] && onChange(v[0])} variant="outline">
    {METALS.map((m) => (
      <ToggleGroupItem key={m.id} value={m.id} aria-label={m.label} title={m.label}>
        <span style={swatch(m.ramp, 14)} />
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
));

// Metal switch with names, for the Metal panel.
const MetalPicker = observer(({ value, onChange }) => (
  <ToggleGroup value={[value]} onValueChange={(v) => v[0] && onChange(v[0])} variant="outline" style={{ width: '100%' }}>
    {METALS.map((m) => (
      <ToggleGroupItem key={m.id} value={m.id} style={{ flex: 1, height: 'auto', flexDirection: 'column', gap: 8, padding: '14px 4px 12px' }}>
        <span style={swatch(m.ramp, 26)} />
        <span style={{ fontFamily: 'var(--jw-display)', fontSize: 14, fontWeight: 500 }}>{m.label}</span>
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
));

export const StoneSwatches = ({ value, onChange }) => (
  <ToggleGroup value={[value]} onValueChange={(v) => v[0] && onChange(v[0])}>
    {STONES.map((s) => (
      <ToggleGroupItem key={s.id} value={s.id} aria-label={s.label} title={s.label} style={{ padding: 4 }}>
        <span style={swatch(s.ramp, 20)} />
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

export const sizeLabel = (mm, cut, stone) => (cut === 'round' && stone === 'diamond' ? `${mm} mm · ${roundDiamondCarat(mm)} ct` : `${mm} mm`);

export const SizeSelect = ({ value, onChange, cut = 'round', stone = 'diamond' }) => (
  <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
    <SelectTrigger size="sm" style={{ minWidth: 96 }} aria-label="Size">
      <SelectValue>{(v) => `${v} mm`}</SelectValue>
    </SelectTrigger>
    <SelectContent alignItemWithTrigger={false} align="start" sideOffset={4} style={{ minWidth: "var(--anchor-width)" }}>
      {SIZES_MM.map((mm) => (
        <SelectItem key={mm} value={String(mm)}>
          {sizeLabel(mm, cut, stone)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const SettingSelect = ({ value, onChange }) => (
  <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)}>
    <SelectTrigger size="sm" style={{ minWidth: 110 }} aria-label="Setting">
      <SelectValue>{(v) => (v === 'none' ? 'Loose stone' : SETTINGS.find((s) => s.id === v)?.label)}</SelectValue>
    </SelectTrigger>
    <SelectContent alignItemWithTrigger={false} align="start" sideOffset={4} style={{ minWidth: "var(--anchor-width)" }}>
      <SelectItem value="none">Loose stone</SelectItem>
      {SETTINGS.map((s) => (
        <SelectItem key={s.id} value={s.id}>
          {s.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const selectedOfKind = (store, kind) => store.selectedElements.filter((e) => kindOf(e) === kind);
const shankOf = (store) => store.activePage?.children.find((e) => kindOf(e) === 'shank');

// --- Metal: metal and shank ------------------------------------------------------------------

const MetalPanel = observer(({ store }) => {
  const shank = shankOf(store);
  const pickShank = (id) => {
    if (shank) {
      // A new band starts at its own width; the finish carries over.
      updatePart(shank, { shank: id, metal: prefs.metal, scale: 1 });
      store.selectElements([shank.id]);
      return;
    }
    const el = addPart(store, { kind: 'shank', shank: id, metal: prefs.metal });
    store.activePage.moveElementsBottom([el.id]);
    ensureGrid(store, theme.name);
  };
  return (
    <Panel store={store} title="Metal">
      <Hint>Sets the metal for the whole ring and for parts you add next.</Hint>
      <MetalPicker
        value={prefs.metal}
        onChange={(m) => {
          runInAction(() => (prefs.metal = m));
          setAllMetal(store, m);
        }}
      />
      <Label>Shank</Label>
      <Hint>
        The shank is the band of the ring, the part that goes round the finger. The head with the stones sits on top of it.{' '}
        {shank ? 'Pick another to swap it: the stones stay where they are.' : 'Pick one to start the ring.'}
      </Hint>
      <Grid min={150}>
        {SHANKS.map((s) => (
          <Card key={s.id} src={shankPart(s.id, prefs.metal).src} label={s.label} ratio={1.5} selected={shank?.custom.shank === s.id} onClick={() => pickShank(s.id)} />
        ))}
      </Grid>
    </Panel>
  );
});

// --- Stones ------------------------------------------------------------------------------------

const paveDraft = observable({ count: 7, size: 1.3, bend: 0 });

const GemsPanel = observer(({ store }) => {
  const addGem = (cut) => {
    const el = addPart(store, { kind: 'gem', cut, stone: prefs.stone, size: prefs.size });
    if (prefs.setting) applySetting(store, el, prefs.setting, shankOf(store)?.custom.metal || prefs.metal);
    store.selectElements([el.id]);
  };
  const addPave = () => addPart(store, { kind: 'pave', count: paveDraft.count, size: paveDraft.size, stone: prefs.stone, metal: prefs.metal, bend: paveDraft.bend });
  return (
    <Panel store={store} title="Stones">
      <Hint>Pick a stone, its size and how it's held, then click a cut to drop it in the middle and drag it into place.</Hint>
      <FieldRow label="Stone">
        <StoneSwatches value={prefs.stone} onChange={(s) => runInAction(() => (prefs.stone = s))} />
      </FieldRow>
      <FieldRow label="Size">
        <SizeSelect value={prefs.size} onChange={(s) => runInAction(() => (prefs.size = s))} stone={prefs.stone} />
      </FieldRow>
      <FieldRow label="Setting">
        <SettingSelect value={prefs.setting} onChange={(s) => runInAction(() => (prefs.setting = s))} />
      </FieldRow>
      <Label>Cuts</Label>
      <Grid min={96}>
        {CUTS.map((c) => (
          <Card key={c.id} src={gemSvg(c.id, prefs.stone)} label={c.label} onClick={() => addGem(c.id)} />
        ))}
      </Grid>
      <Label>Pavé row</Label>
      <Hint>A row of small stones set side by side, for bands and halos.</Hint>
      <Card
        src={paveSvg({ count: paveDraft.count, stoneId: prefs.stone, beadColor: beadColors(prefs.metal), bend: paveDraft.bend }).src}
        label={`${paveDraft.count} stones, ${paveDraft.size} mm`}
        ratio={4}
        onClick={addPave}
      />
      <SliderField label="Stones" value={paveDraft.count} min={2} max={21} step={1} onChange={(v) => runInAction(() => (paveDraft.count = v))} />
      <SliderField label="Stone size, mm" value={paveDraft.size} min={0.8} max={2.5} step={0.1} onChange={(v) => runInAction(() => (paveDraft.size = v))} />
      <SliderField label="Bend" value={paveDraft.bend} min={-3} max={3} step={0.1} onChange={(v) => runInAction(() => (paveDraft.bend = v))} />
      <Button onClick={addPave}>Add pavé row</Button>
    </Panel>
  );
});

// --- Settings ------------------------------------------------------------------------------------

// Band options: its width across the finger, in mm, and its finish.
const BandOptions = observer(({ shank }) => {
  const natural = shankPart(shank.custom.shank, shank.custom.metal).height;
  const scale = shank.custom.scale || 1;
  const width = Math.round(natural * scale * 10) / 10;
  return (
    <>
      <Hint>The band is selected. Set how wide it is and how its metal is finished.</Hint>
      <SliderField
        label="Band width, mm"
        value={width}
        min={Math.round(natural * 0.6 * 10) / 10}
        max={Math.round(natural * 1.6 * 10) / 10}
        step={0.1}
        onChange={(v) => updatePart(shank, { scale: v / natural })}
      />
      <FieldRow label="Finish">
        <ToggleGroup value={[shank.custom.finish || 'polished']} onValueChange={(v) => v[0] && updatePart(shank, { finish: v[0] })} variant="outline">
          {FINISHES.map((f) => (
            <ToggleGroupItem key={f.id} value={f.id}>
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldRow>
    </>
  );
});

const SettingsPanel = observer(({ store }) => {
  const gems = selectedOfKind(store, 'gem');
  const bands = selectedOfKind(store, 'shank');
  const page = store.activePage;
  const metal = shankOf(store)?.custom.metal || prefs.metal;
  const sample = gems[0]?.custom || { cut: 'round', size: 6 };
  const current = gems[0] ? settingOf(page, gems[0])?.custom.setting : null;
  const apply = (id) => store.history.transaction(() => gems.forEach((g) => applySetting(store, g, id, metal)));
  const { width, height } = gemSizeMm(sample.cut, sample.size);
  if (bands.length) {
    return (
      <Panel store={store} title="Settings">
        <BandOptions shank={bands[0]} />
      </Panel>
    );
  }
  return (
    <Panel store={store} title="Settings">
      <Hint>
        {gems.length
          ? `Pick how the ${gems.length > 1 ? `${gems.length} selected stones are` : 'selected stone is'} held. The setting sizes itself to the stone and moves with it.`
          : 'Select a stone to choose how it is held, or the band to set its width and finish.'}
      </Hint>
      <Grid min={150}>
        {SETTINGS.map((s) => {
          const p = settingPart(s.id, metal, sample.cut, width, height);
          const box = 96;
          const inner = box / REACH[s.id];
          return (
            <Card key={s.id} label={s.label} selected={current === s.id} disabled={!gems.length} onClick={() => apply(s.id)}>
              <div style={{ position: 'relative', width: box, height: box }}>
                <img src={gemSvg(sample.cut, gems[0]?.custom.stone || 'diamond')} alt="" style={{ position: 'absolute', left: (box - inner) / 2, top: (box - inner) / 2, width: inner, height: inner, objectFit: 'contain' }} />
                <img src={p.src} alt="" style={{ position: 'absolute', inset: 0, width: box, height: box, objectFit: 'contain' }} />
              </div>
            </Card>
          );
        })}
      </Grid>
      {gems.length > 0 && current && (
        <Button variant="outline" onClick={() => apply(null)}>
          Remove setting
        </Button>
      )}
    </Panel>
  );
});

// --- Designs: starters -----------------------------------------------------------------------------

const DesignsPanel = observer(({ store }) => {
  return (
    <Panel store={store} title="Designs">
      <Hint>Start from a finished ring and change it, or build one from scratch in Metal and Stones.</Hint>
      <Grid min={150}>
        {STARTERS.map((s) => (
          <Card key={s.id} src={starterThumb(s)} label={s.label} onClick={() => loadStarter(store, s.id)} />
        ))}
      </Grid>
    </Panel>
  );
});

// --- Render ----------------------------------------------------------------------------------------

// `scene` is a preset id or 'custom'. Presets write the prompt from the
// design; Custom keeps the user's own text.
const renderDraft = observable({ scene: 'studio', prompt: '', count: 1, model: MODELS[0].id });

const RenderPanel = observer(({ store }) => {
  const [preview, setPreview] = React.useState(null);
  // The prompt follows the design and scene until the user edits it.
  const custom = renderDraft.scene === CUSTOM.id;
  const prompt = custom ? renderDraft.prompt : promptFor(store, renderDraft.scene);
  const pickScene = (v) =>
    runInAction(() => {
      // Custom starts empty: the user writes the shot from scratch.
      if (v === CUSTOM.id) renderDraft.prompt = '';
      renderDraft.scene = v;
    });
  const empty = !store.activePage?.children.some((e) => kindOf(e));
  const model = modelById(renderDraft.model);
  const [locked, setLocked] = React.useState(false);
  // The public build has no AI endpoint: Render explains how to get it.
  const start = () =>
    AI.live ? runRenders(store, { sceneId: renderDraft.scene, prompt, count: renderDraft.count, models: [renderDraft.model] }) : setLocked(true);
  const blank = !prompt.trim();
  return (
    <Panel store={store} title="Render">
      <Hint>Turns the flat design into a photo with an AI image model, keeping the design as it is.</Hint>

      <Label>Model</Label>
      <Select value={renderDraft.model} onValueChange={(v) => runInAction(() => (renderDraft.model = v))}>
        <SelectTrigger aria-label="Model" style={{ width: '100%' }}>
          <SelectValue>{(v) => `${modelById(v).label} · ${modelById(v).vendor}`}</SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start" sideOffset={4} style={{ minWidth: "var(--anchor-width)" }}>
          {MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label} · {m.vendor}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Hint>{model.note}</Hint>

      <Label>Shot</Label>
      {/* Scene and prompt are one thing: the scene writes the prompt, the
          prompt is what the model is told. */}
      <div style={{ border: '1px solid var(--pn-border)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Select value={renderDraft.scene} onValueChange={pickScene}>
          <SelectTrigger aria-label="Scene" style={{ width: '100%' }}>
            <SelectValue>{(v) => sceneLabel(v)}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start" sideOffset={4} style={{ minWidth: "var(--anchor-width)" }}>
            {SCENES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM.id}>{CUSTOM.label}</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          aria-label="Prompt"
          value={prompt}
          rows={8}
          placeholder="Describe the shot: the setting, the light, the angle."
          // Typing makes it a custom prompt.
          onChange={(e) => runInAction(() => Object.assign(renderDraft, { prompt: e.target.value, scene: CUSTOM.id }))}
          style={{ fontSize: 13, lineHeight: 1.55 }}
        />
        <Hint>
          {custom
            ? 'Your own prompt. Pick a scene to have it written from the design again.'
            : 'Written from your design and the scene. Edit it, or pick Custom to start from a blank prompt.'}
        </Hint>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <FieldRow label="Images">
          <ToggleGroup value={[String(renderDraft.count)]} onValueChange={(v) => v[0] && runInAction(() => (renderDraft.count = Number(v[0])))} variant="outline">
            {['1', '2', '4'].map((n) => (
              <ToggleGroupItem key={n} value={n} style={{ minWidth: 36 }}>
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldRow>
        <Button onClick={start} disabled={empty || blank || renders.running > 0} style={{ width: '100%', height: 40, fontSize: 14, letterSpacing: '0.04em' }}>
          {renders.running > 0 ? `Rendering ${renders.running}…` : `Render ${renderDraft.count === 1 ? 'photo' : `${renderDraft.count} photos`}`}
        </Button>
        {empty && <Hint>Add a shank or a stone first.</Hint>}
        {!AI.live && <Hint>AI rendering is switched off in this public demo.</Hint>}
        {renders.error && <p style={{ fontSize: 12, margin: 0, color: 'var(--pn-destructive)' }}>{renders.error}</p>}
      </div>

      <Grid min={150}>
        {Array.from({ length: renders.running }, (_, i) => (
          <Card key={`p${i}`} label="Rendering…" disabled>
            <Spinner />
          </Card>
        ))}
        {renders.results.map((r) => (
          <Card key={r.id} label={`${modelById(r.model).label} · ${sceneLabel(r.scene)}`} onClick={() => setPreview(r)}>
            <img src={r.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
          </Card>
        ))}
      </Grid>
      <RenderPreview render={preview} onClose={() => setPreview(null)} />
      <FullDemoNote open={locked} model={model} onClose={() => setLocked(false)} />
    </Panel>
  );
});

// Shown in the public demo when someone presses Render.
const FullDemoNote = ({ open, model, onClose }) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent style={{ maxWidth: 440 }}>
      <DialogHeader>
        <DialogTitle>Render with AI</DialogTitle>
      </DialogHeader>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
        In the full demo, Render sends this design to {model.label} and returns a photo of the ring, in the scene you picked, in about a minute.
      </p>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--pn-muted-foreground)' }}>
        Live AI is switched off in this public version. Get in touch and we'll set up the full demo for you.
      </p>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {/* A link styled as Polotno's primary button: it leaves the demo. */}
        <a href={CONTACT_URL} target="_top" rel="noreferrer" className={buttonVariants({ variant: 'default' })} style={{ textDecoration: 'none' }}>
          Contact us
        </a>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const RenderPreview = ({ render, onClose }) => {
  const download = async () => {
    // Replicate serves results from another domain, so fetch it to save it.
    const blob = await fetch(render.src).then((r) => r.blob());
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ring-${render.scene}.jpg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Dialog open={!!render} onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={{ maxWidth: 'min(92vw, 1000px)' }}>
        {render && (
          <>
            <DialogHeader>
              <DialogTitle>
                {modelById(render.model).label} · {sceneLabel(render.scene)}
              </DialogTitle>
            </DialogHeader>
            <img src={render.src} alt="AI render of the ring" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 6 }} />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={download}>Download</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// --- sections ---------------------------------------------------------------------------------------

const section = (name, title, icon, PanelBody) => ({
  name,
  Tab: (props) => {
    const I = ICONS[icon];
    return (
      <SectionTab name={title} {...props}>
        <I />
      </SectionTab>
    );
  },
  Panel: PanelBody,
});

export const SECTIONS = [
  section('designs', 'Designs', 'designs', DesignsPanel),
  section('metal', 'Metal', 'metal', MetalPanel),
  section('stones', 'Stones', 'stones', GemsPanel),
  section('settings', 'Settings', 'settings', SettingsPanel),
  section('render', 'Render', 'render', RenderPanel),
];

export { metalParts, PX };
